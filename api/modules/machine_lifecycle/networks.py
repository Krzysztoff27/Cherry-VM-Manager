from __future__ import annotations

import logging
import libvirt
import psycopg
import xml.etree.ElementTree as ET

from typing import Union
from uuid import UUID
from ipaddress import IPv4Interface

from modules.postgresql.simple_select import select_single_field, select_one, select_rows
from modules.libvirt_socket import LibvirtConnection
from modules.machine_lifecycle.xml_translator import get_required_xml_tag, get_required_xml_tag_attribute, parse_machine_xml, create_machine_network_interface_xml
from modules.machine_lifecycle.models import MachineNetworkInterface, InternetInterface, NetworkInterfaceSource
from modules.postgresql.main import pool
from modules.network_configuration.models import InternalNetworkSetForm
from utils.mac import generate_random_mac

logger = logging.getLogger(__name__)

################################
#   Remote access networking
################################
def get_network_bridge_ip(network_id: Union[UUID, str]) -> str:
    """
    Finds IP address of network's bridge element.
    """
    with LibvirtConnection("ro") as libvirt_connection:
        if isinstance(network_id, UUID):
            network = libvirt_connection.networkLookupByUUID(network_id.bytes) # pyright: ignore[reportArgumentType] # pyright: ignore[reportArgumentType]
        else:
            network = libvirt_connection.networkLookupByName(network_id)
        
        network_xml = network.XMLDesc()
        
    network_root = ET.fromstring(network_xml)
    
    ip = get_required_xml_tag(network_root, "ip")
    
    bridge_ip = get_required_xml_tag_attribute(ip, "address")
        
    return bridge_ip


def get_machine_framebuffer_port(machine_uuid: UUID) -> str:
    """
    Find framebuffer port of a given machine.
    """
    with LibvirtConnection("ro") as libvirt_connection:
        machine = libvirt_connection.lookupByUUID(machine_uuid.bytes) # pyright: ignore[reportArgumentType]
        
        machine_xml = machine.XMLDesc()
        
        machine_parameters = parse_machine_xml(machine_xml)
        
        framebuffer_port = machine_parameters.framebuffer.port
        
        if framebuffer_port is None:
            raise Exception(f"Failed to extract framebuffer port of {machine_uuid}")
        
        return framebuffer_port

################################
# Internet gateway attachment
################################
def establish_libvirt_affect_flags(machine_uuid: UUID):
    
    from modules.machine_state.state_management import is_vm_running
    
    if is_vm_running(machine_uuid):
        flags = libvirt.VIR_DOMAIN_AFFECT_LIVE | libvirt.VIR_DOMAIN_AFFECT_CONFIG
    else:
        flags = libvirt.VIR_DOMAIN_AFFECT_CONFIG
    
    return flags


def attach_internet_interface(machine_uuid: UUID) -> None:
    """
    Attaches an Internet interface to a running machine.
    """
    
    internet_interface = InternetInterface()
    internet_interface.mac = generate_random_mac()
    
    logger.debug(f"Attaching Internet interface {internet_interface.name} to machine {machine_uuid}.")
    
    interface_xml = ET.tostring(create_machine_network_interface_xml(internet_interface), encoding="unicode")              
    
    
    with LibvirtConnection("rw") as libvirt_connection:
        try:
            machine = libvirt_connection.lookupByUUID(machine_uuid.bytes) # pyright: ignore[reportArgumentType]
            
            machine.attachDeviceFlags(interface_xml, establish_libvirt_affect_flags(machine_uuid))
            
        except libvirt.libvirtError as e:
                raise Exception(f"Failed to attach Internet interface {internet_interface.name} to machine {machine_uuid} because of Libvirt error.") from e
    
    
    with pool.connection() as connection:
        with connection.cursor() as cursor:
            with connection.transaction():
                try:
                    cursor.execute("INSERT INTO internet_connections (machine_uuid, interface_mac) VALUES (%s, %s)",(machine_uuid, internet_interface.mac))

                except psycopg.Error as e:
                    raise Exception(f"Failed to attach Internet interface {internet_interface.name} to machine {machine_uuid} because of Database error.") from e

    
def detach_internet_interface(machine_uuid: UUID) -> None:
    """
    Detaches an Internet interface from a running machine.
    """
    
    logger.debug(f"Detaching Internet interface from machine {machine_uuid}.")
    
    internet_interface_result = select_one("SELECT interface_mac FROM internet_connections WHERE machine_uuid = %s;", (machine_uuid,))
    
    if internet_interface_result is not None:
        internet_interface_mac = internet_interface_result["interface_mac"]
    else:
        raise Exception(f"Failed to find Internet interface for machine {machine_uuid} in the database.")
    
    interface_minimal_xml = f"""
        <interface>
            <mac address="{internet_interface_mac}"/>
        </interface>
    """

    with LibvirtConnection("rw") as libvirt_connection:
        try:
            machine = libvirt_connection.lookupByUUID(machine_uuid.bytes) # pyright: ignore[reportArgumentType]
                        
            machine.detachDeviceFlags(interface_minimal_xml, establish_libvirt_affect_flags(machine_uuid))
            
        except libvirt.libvirtError as e:
            raise Exception(f"Failed to detach Internet interface from machine {machine_uuid} because of Libvirt error.") from e
         
                    
    with pool.connection() as connection:
        with connection.cursor() as cursor:
            with connection.transaction():
                try:
                    cursor.execute("DELETE FROM internet_connections WHERE machine_uuid = %s AND interface_mac = %s", (machine_uuid, internet_interface_mac))

                except psycopg.Error as e:
                    raise Exception(f"Failed to detach Internet interface from machine {machine_uuid} because of Database error.") from e
                
                except Exception as e:
                    logger.error(f"Failed to detach Internet interface from machine {machine_uuid}: {repr(e)}.")


################################
# Internal networks attachment
################################
def attach_network_interface(machine_uuid: UUID, network_interface: MachineNetworkInterface) -> None:
    """
    Attaches a network interface to a running machine.
    """
    
    logger.debug(f"Attaching network interface {network_interface.mac} to machine {machine_uuid}.")
    
    intnet_uuid = network_interface.source.value
    
    interface_xml = ET.tostring(create_machine_network_interface_xml(network_interface), encoding="unicode")
                    

    with LibvirtConnection("rw") as libvirt_connection:
        try:
            machine = libvirt_connection.lookupByUUID(machine_uuid.bytes) # pyright: ignore[reportArgumentType]
            
            machine.attachDeviceFlags(interface_xml, establish_libvirt_affect_flags(machine_uuid))
            
        except libvirt.libvirtError as e:
            raise Exception(f"Failed to attach network interface {network_interface.mac} to machine {machine_uuid} because of Libvirt error.") from e
                        
    
    with pool.connection() as connection:
        with connection.cursor() as cursor:
            with connection.transaction():
                try:
                    cursor.execute("INSERT INTO intnets_connections (intnet_uuid, machine_uuid, interface_mac, interface_ip) VALUES (%s, %s, %s, %s)", (intnet_uuid, machine_uuid, network_interface.mac, network_interface.ip))
                    
                except psycopg.Error as e:
                    raise Exception(f"Failed to attach network interface {network_interface.mac} to machine {machine_uuid} because of Database error.") from e

    
def detach_network_interface(machine_uuid: UUID, mac_address: str) -> None: 
    """
    Detaches a network interface from a running machine.
    """
    
    logger.debug(f"Detaching network interface with MAC {mac_address} from machine {machine_uuid}.")
    
    interface_minimal_xml = f"""
        <interface>
            <mac address="{mac_address}"/>
        </interface>
    """
    
    with LibvirtConnection("rw") as libvirt_connection:
        try:
            machine = libvirt_connection.lookupByUUID(machine_uuid.bytes) # pyright: ignore[reportArgumentType]
                        
            machine.detachDeviceFlags(interface_minimal_xml, establish_libvirt_affect_flags(machine_uuid))
            
        except libvirt.libvirtError as e:
            raise Exception(f"Failed to detach network interface {mac_address} from machine {machine_uuid} because of Libvirt error.") from e
    
    with pool.connection() as connection:
        with connection.cursor() as cursor:
            with connection.transaction():
                try:
                    cursor.execute("DELETE FROM intnets_connections WHERE machine_uuid = %s AND interface_mac = %s", (machine_uuid, mac_address))
                    
                except psycopg.Error as e:
                    raise Exception(f"Failed to detach network interface {mac_address} from machine {machine_uuid} because of Database error.") from e

################################
#     Internal networks
################################
def create_internal_network(owner_uuid: UUID, internal_network_set_form: InternalNetworkSetForm) -> None:
    """
    Creates a new internal network.
    """
    
    logger.debug(f"Creating new internal network {internal_network_set_form.uuid}")
    
    if not internal_network_set_form.intnet_name or not internal_network_set_form.machines:
        raise Exception("intnet_name and machines are required to create an internal network.")
    
    bridge_mac = generate_random_mac()
                    
    internal_network_xml_lines = [
        "<network>",
        f"<name>{internal_network_set_form.uuid}</name>",
        f"<uuid>{internal_network_set_form.uuid}</uuid>",
        f"<mac address='{bridge_mac}'/>"
    ]
                    
    if internal_network_set_form.bridge_ip is not None:
        internal_network_xml_lines.append(f"<ip address='{internal_network_set_form.bridge_ip.ip}' netmask='{internal_network_set_form.bridge_ip.netmask}'/>")
    
    internal_network_xml_lines.append("</network>")
    
    internal_network_xml = "\n".join(internal_network_xml_lines)
    
    
    with LibvirtConnection("rw") as libvirt_connection:
        try:
            network = libvirt_connection.networkDefineXML(internal_network_xml)
            network.setAutostart(True)
            network.create()
            
        except libvirt.libvirtError as e:
            raise Exception(f"Failed to create internal network {internal_network_set_form.uuid} because of Libvirt error.") from e
    
    
    with pool.connection() as connection:
        with connection.cursor() as cursor:
            with connection.transaction():
                try:
                    cursor.execute("INSERT INTO intnets (uuid, owner_uuid, intnet_name, bridge_mac, bridge_ip) VALUES (%s, %s, %s, %s, %s)", (
                        internal_network_set_form.uuid,
                        owner_uuid,
                        internal_network_set_form.intnet_name,
                        bridge_mac,
                        internal_network_set_form.bridge_ip
                    ))
            
                except psycopg.Error as e:
                    raise Exception(f"Failed to create internal network {internal_network_set_form.uuid} because of Database error.") from e

                    
    for machine in internal_network_set_form.machines:
        interface = MachineNetworkInterface(
            mac=generate_random_mac(),
            source=NetworkInterfaceSource(type="network", value=str(internal_network_set_form.uuid))
        )
        attach_network_interface(machine, interface)
                        
def delete_internal_network(intnet_uuid: UUID) -> None:
    """
    Removes an existing internal network.
    """
    
    logger.debug(f"Removing internal network {intnet_uuid} connections.")
    
    connected_machines = select_rows("SELECT machine_uuid, interface_mac FROM intnets_connections WHERE intnet_uuid = %s", (intnet_uuid,))
    
    for connection in connected_machines:
        detach_network_interface(connection["machine_uuid"], connection["interface_mac"])
    
    logger.debug(f"Removing internal network {intnet_uuid}.")
    
    with LibvirtConnection("rw") as libvirt_connection:
        try:
            network = libvirt_connection.networkLookupByUUID(intnet_uuid.bytes) # pyright: ignore[reportArgumentType]
            network.destroy()
            network.undefine()
            
        except libvirt.libvirtError as e:
            raise Exception(f"Failed to delete internal network {intnet_uuid} because of Libvirt error.") from e
    
    with pool.connection() as connection:
        with connection.cursor() as cursor:
            with connection.transaction():
                try:   
                    cursor.execute("DELETE FROM intnets WHERE uuid = %s", (intnet_uuid,))

                except psycopg.Error as e:
                    raise Exception(f"Failed to delete internal network {intnet_uuid} because of Database error.") from e


def modify_internal_network(intnet_uuid: UUID, internal_network_set_form: InternalNetworkSetForm) -> None:
    """
    Modifies an existing internal network.
    """
    
    logger.debug(f"Modifying internal network {intnet_uuid}.")
    
    
    if internal_network_set_form.bridge_ip is not None:
        with LibvirtConnection("rw") as libvirt_connection:
            try:
                network = libvirt_connection.networkLookupByUUID(intnet_uuid.bytes) # pyright: ignore[reportArgumentType]
                                    
                network_xml = network.XMLDesc(0)
                
                network_root = ET.fromstring(network_xml)
                ip_element = network_root.find("ip")
                
                modified_network_xml = ""
                
                if internal_network_set_form.bridge_ip == IPv4Interface("0.0.0.0/32"):
                    
                    if ip_element is not None:    
                        
                        network_root.remove(ip_element)
                        modified_network_xml = ET.tostring(network_root, encoding="unicode")
        
                else: 
                                
                    if ip_element is None:
                        
                        ip_element = ET.SubElement(network_root, "ip")

                    ip_element.set("address", str(internal_network_set_form.bridge_ip.ip))
                    ip_element.set("netmask", str(internal_network_set_form.bridge_ip.netmask))
                    modified_network_xml = ET.tostring(network_root, encoding="unicode")
                    
                if network.isActive():
                    network.destroy()
                network.undefine()
                
                libvirt_connection.networkDefineXML(modified_network_xml)
                
                network.setAutostart(True)

                network.create()

            except libvirt.libvirtError as e:
                raise Exception(f"Failed to modify internal network {intnet_uuid} because of Libvirt error.") from e
    
    
    with pool.connection() as connection:
        with connection.cursor() as cursor:
            with connection.transaction():
                try:
                    if internal_network_set_form.intnet_name is not None:
                        cursor.execute("UPDATE intnets SET intnet_name = %s WHERE uuid = %s", (internal_network_set_form.intnet_name, intnet_uuid))
                        
                    if internal_network_set_form.bridge_ip is not None:
                        
                        if internal_network_set_form.bridge_ip == IPv4Interface("0.0.0.0/32"):
                            cursor.execute("UPDATE intnets SET bridge_ip = NULL WHERE uuid = %s", (intnet_uuid,))
                        else:
                            cursor.execute("UPDATE intnets SET bridge_ip = %s WHERE uuid = %s", (internal_network_set_form.bridge_ip, intnet_uuid))
                    
                except psycopg.Error as e:
                    raise Exception(f"Failed to modify internal network {intnet_uuid} because of Database error.") from e
    
    
    if internal_network_set_form.machines is not None:
                    
        connected_machines_db = set(select_single_field("machine_uuid", "SELECT machine_uuid FROM intnets_connections WHERE intnet_uuid = %s", (intnet_uuid,)))
        connected_machines_incoming = set(internal_network_set_form.machines)
        
        deleted_connections = connected_machines_db - connected_machines_incoming
        new_connections = connected_machines_incoming - connected_machines_db
        
        for machine in deleted_connections:
            mac_address = select_single_field("interface_mac", "SELECT interface_mac FROM intnets_connections WHERE intnet_uuid = %s AND machine_uuid = %s", (intnet_uuid, machine))[0]
            detach_network_interface(machine, mac_address)
            
        for machine in new_connections:
            interface = MachineNetworkInterface(
                mac=generate_random_mac(),
                source=NetworkInterfaceSource(type="network", value=str(intnet_uuid))
            )
            attach_network_interface(machine, interface)