from __future__ import annotations

import logging
import string
import xml.etree.ElementTree as ET

from uuid import UUID, uuid4
from typing import Union, Optional, Any, Literal
from pathlib import Path

from modules.machine_lifecycle.disks import get_machine_disk_size
from modules.machine_lifecycle.models import MachineParameters, MachineDisk, MachineNetworkInterface, MachineMetadata, StoragePool, MachineGraphicalFramebuffer, NetworkInterfaceSource, CreateMachineForm, CreateMachineFormDisk, InternetInterface
from modules.postgresql.simple_select import select_rows

logger = logging.getLogger(__name__)

################################
#      Helper functions
################################
def get_required_xml_tag(root_element: ET.Element, path: str, namespaces: Optional[dict[str, str]] = None) -> ET.Element:
    """
    Finds XML tag. Raises error if tag is missing.
    """
    tag = root_element.find(path=path, namespaces=namespaces)
    
    if tag is None:
        raise ValueError(f"Element {path} not found in XML string.")
    return tag


def get_required_xml_tag_text(root_element: ET.Element, path: str, namespaces: Optional[dict[str, str]] = None) -> str:
    """
    Finds XML tag text property. Raises error if tag is missing.
    """ 
    text = root_element.findtext(path=path, namespaces=namespaces)
    
    if text is None:
        raise ValueError(f"Element {path} not found in XML string.")
    return text


def get_required_xml_tag_attribute(root_element: ET.Element, key: str, default: Optional[Any] = None):
    """
    Finds XML tag attribute. Raises error if tag is missing.
    """ 
    text = root_element.get(key=key, default=default)
    
    if text is None:
        raise ValueError(f"Attribute {key} not found in XML tag {root_element}.")
    return text


def translate_disk_form_to_disk(disk_form: CreateMachineFormDisk) -> MachineDisk:
    return MachineDisk(
        **disk_form.model_dump(exclude={"size_bytes"}), 
        size=disk_form.size_bytes,
        pool = "cvms-disk-images"
    )


def translate_machine_form_to_machine_parameters(machine_form: CreateMachineForm) -> MachineParameters:
    
    system_disk = translate_disk_form_to_disk(machine_form.disks[machine_form.os_disk])
    additional_disks = [translate_disk_form_to_disk(disk) for i, disk in enumerate(machine_form.disks) if i != machine_form.os_disk]
    
    return MachineParameters(
        uuid = uuid4(),
        title = machine_form.title,
        ordinal_number = 0,
        description = machine_form.description,
        metadata = [MachineMetadata(tag = "tags", value = tag) for tag in machine_form.tags] if machine_form.tags else [],
        ram = machine_form.config.ram,
        vcpu = machine_form.config.vcpu,
        system_disk = system_disk,
        additional_disks = additional_disks,
        iso_image = (StoragePool(pool = "cvms-iso-images", volume = f"{str(machine_form.source_uuid)}.iso") if machine_form.source_type == "iso" else None),
        # Add snapshot as source type,
        framebuffer = MachineGraphicalFramebuffer(type = "vnc", autoport = True, listen_type = "network", listen_network = "cherry-ras"),
        assigned_clients = machine_form.assigned_clients,
        internet_connectivity = machine_form.internet_connectivity
    )

################################
#    XML elements creation
################################
def create_machine_disk_xml(root_element: ET.Element, machine_disk: MachineDisk, disk_uuid: UUID, system: Union[Literal[True], Literal[False]], target: str | None = None) -> ET.Element:
    if system is False and target is None:
        raise ValueError("target must be specified when creating non-system disk")
    
    disk = ET.SubElement(root_element, "disk", type="volume", device="disk")
    
    ET.SubElement(disk, "alias", name=f"ua-{machine_disk.name}")
    ET.SubElement(disk, "driver", name="qemu", type=machine_disk.type)
    
    # Verified by MachineDisk model validator
    ET.SubElement(disk, "source", pool=machine_disk.pool, volume=f"{disk_uuid}.{machine_disk.type}")
        
    if system:
        ET.SubElement(disk, "target", dev="vda", bus="virtio")
        ET.SubElement(disk, "boot", order="1")
    else:
        assert target is not None
        ET.SubElement(disk, "target", dev=target, bus="virtio")
    return disk


def create_machine_network_interface_xml(network_interface: MachineNetworkInterface, root_element: Optional[ET.Element] = None) -> ET.Element:
    
    if root_element is None:
        iface = ET.Element("interface", type=network_interface.source.type)
    else:
        iface = ET.SubElement(root_element, "interface", type=network_interface.source.type)

    if network_interface.mac is not None:
        ET.SubElement(iface, "mac", address=network_interface.mac)

    source_attribute = {network_interface.source.type: network_interface.source.value}
    ET.SubElement(iface, "source", attrib=source_attribute)
    
    # Servers a similar purpose to alias, but is present even when the machine is offline.
    # Used for information purposes only, not as a unique identifier.
    # ET.SubElement(iface, "target", dev=network_interface.name)
    
    ET.SubElement(iface, "model", type="virtio")
    
    return iface


def create_machine_graphics_xml(root_element: ET.Element, framebuffer: MachineGraphicalFramebuffer) -> ET.Element:
    if framebuffer.autoport:
        graphics = ET.SubElement(root_element, "graphics", type=framebuffer.type, autoport="yes")
    elif framebuffer.port is not None:
        graphics = ET.SubElement(root_element, "graphics", type=framebuffer.type, autoport="no", port=framebuffer.port)
    else:
        raise ValueError("If autoport is set to False, the port must be specified manually with framebuffer.port")
    
    if framebuffer.listen_type == "network":
        assert framebuffer.listen_network is not None
        ET.SubElement(graphics, "listen", type=framebuffer.listen_type, network=framebuffer.listen_network)
    elif framebuffer.listen_type == "address":
        assert framebuffer.listen_address is not None
        ET.SubElement(graphics, "listen", type=framebuffer.listen_type, address=framebuffer.listen_address)
    
    return graphics
   
    
def create_machine_xml(machine: MachineParameters, machine_uuid: UUID) -> str:
    """
    Gets MachineParameters object and creates XML string based on it.
    """
    
    try:
        
        domain = ET.Element("domain", type="kvm")
        
        
        uuid = ET.SubElement(domain, "uuid")
        uuid.text = str(machine_uuid)
        
        
        name = ET.SubElement(domain, "name")
        name.text = str(machine_uuid)
        
        
        title = ET.SubElement(domain, "title")
        title.text = machine.title
        
        description = ET.SubElement(domain, "description")
        if machine.description:
            description.text = machine.description
        else:
            description.text = ""


        metadata = ET.SubElement(domain, "metadata")
        vm_info = ET.SubElement(metadata, "vm:info", {"xmlns:vm": "http://example.com/virtualization"})
        
        
        ordinal_number_tag = ET.SubElement(vm_info, f"vm:ordinal_number")
        ordinal_number_tag.text = str(machine.ordinal_number)
        
        if machine.metadata:
            for machine_metadata in machine.metadata:
                tag = ET.SubElement(vm_info, f"vm:{machine_metadata.tag}")
                tag.text = str(machine_metadata.value)


        ram = ET.SubElement(domain, "memory", unit="MiB")
        ram.text = str(machine.ram)


        vcpu = ET.SubElement(domain, "vcpu")
        vcpu.text = str(machine.vcpu)
        
        
        os = ET.SubElement(domain, "os")
        type = ET.SubElement(os, "type")
        type.text = "hvm"
        
        
        features = ET.SubElement(domain, 'features')
        ET.SubElement(features, 'acpi')
        ET.SubElement(features, 'apic')
        ET.SubElement(features, 'pae')
        
        
        cpu = ET.SubElement(domain, 'cpu', mode='host-model', check='partial')
        ET.SubElement(cpu, 'model', fallback='allow')
        
        
        ET.SubElement(domain, 'on_poweroff').text = 'destroy'
        ET.SubElement(domain, 'on_reboot').text = 'restart'
        ET.SubElement(domain, 'on_crash').text = 'restart'
        
        
        devices = ET.SubElement(domain, "devices")
        
        if not machine.system_disk.uuid:
            raise ValueError(f"{machine.system_disk.name} element needs to contain a valid UUID!")
        create_machine_disk_xml(devices, machine.system_disk, machine.system_disk.uuid, True)
        
        cdrom = ET.SubElement(devices, "disk", type="volume", device="cdrom")
        ET.SubElement(cdrom, "alias", name="ua-cd-rom")
        ET.SubElement(cdrom, "driver", name="qemu", type="raw")
        
        if machine.iso_image:
            if isinstance(machine.iso_image, StoragePool):
                ET.SubElement(cdrom, "source", pool=machine.iso_image.pool, volume=machine.iso_image.volume)
            else:
                raise ValueError("iso_image must be of type StoragePool")
                
        ET.SubElement(cdrom, "target", dev="sda", bus="sata")
        ET.SubElement(cdrom, "readonly")
        ET.SubElement(cdrom, "boot", order="2")
        
        if machine.additional_disks:
            device = "vdc"
            device_prefix = device[:-1] # "vd" from "vdc"
            
            for disk in machine.additional_disks:
                if not disk.uuid:
                    raise ValueError(f"{disk.name} need to contain a valid UUID!")
                create_machine_disk_xml(devices, disk, disk.uuid, False, device)
                
                device_suffix = device[-1]
                new_suffix = string.ascii_lowercase[string.ascii_lowercase.index(device_suffix) + 1]
                device = f"{device_prefix}{new_suffix}"

        if machine.network_interfaces:
            for nic in machine.network_interfaces:
                create_machine_network_interface_xml(nic, devices)

        if machine.internet_connectivity and machine.internet_interface is not None:
            create_machine_network_interface_xml(machine.internet_interface, devices)

        create_machine_graphics_xml(devices, machine.framebuffer)

        video = ET.SubElement(devices, "video")
        model = ET.SubElement(video, "model", type="virtio", heads="1")
        ET.SubElement(model, "resolution", x="1920", y="1080")


        # Output XML as a string
        machine_xml = ET.tostring(domain, encoding="unicode")
        
        logger.debug(machine_xml)
        
        return machine_xml
    
    except Exception as e:
        raise Exception(f"Failed to create machine XML: {e}")


################################
#    XML elements parsing
################################
def parse_machine_disk(disk_element: ET.Element) -> MachineDisk:
    """
    Parse <disk> element back into MachineDisk model.
    """
    # Name
    alias_el = get_required_xml_tag(disk_element, "alias")
    name = get_required_xml_tag_attribute(alias_el, "name").removeprefix("ua-")
    
    # Source
    allowed_pool_types = ["cvms-disk-images", "cvms-iso-images", "cvms-network-filesystems"]
    source_el = get_required_xml_tag(disk_element, "source")
    
    # Volume - serving as UUID
    if "pool" in source_el.attrib and "volume" in source_el.attrib:
        pool = get_required_xml_tag_attribute(source_el, "pool")
        
        if pool not in allowed_pool_types:
            raise ValueError(f"StoragePool pool cannot be of type: {pool}")
        
        volume = get_required_xml_tag_attribute(source_el, "volume")
    else:
        raise ValueError(f"Disk source not found or is of unsupported type. It must be either file or storage pool.")
    
    # Size
    disk_uuid = Path(volume).stem
    disk_size = get_machine_disk_size(UUID(disk_uuid), pool)
    

    # Type
    allowed_disk_types = ["raw", "qcow2", "qed", "qcow", "luks", "vdi", "vmdk", "vpc", "vhdx"] 
    driver_el = get_required_xml_tag(disk_element, "driver")
    type = get_required_xml_tag_attribute(driver_el, "type")
    
    if type not in allowed_disk_types:
        raise ValueError(f"MachineDisk cannot be of type: {type}")

    return MachineDisk(
        uuid=UUID(disk_uuid),
        name=name,
        size=disk_size,
        type=type, # type: ignore - type is checked against allowed disk types after being fetched from the XML string
        pool=pool # type: ignore - type is checked against allowed pools after being fetched from the XML string
    )


def parse_machine_network_interface(iface_element: ET.Element) -> MachineNetworkInterface:
    """
    Parse <interface> element back into MachineNetworkInterface model.
    """
    
    # target_el = get_required_xml_tag(iface_element, "target")
    # target = get_required_xml_tag_attribute(target_el, "dev")

    # Source type and value
    source_el = get_required_xml_tag(iface_element, "source")
    source_type = None
    source_value = None
    
    for key, value in source_el.attrib.items():
        source_type = key
        source_value = value
        break

    allowed_source_types = ["network", "bridge"]
    if source_type not in allowed_source_types:
        raise ValueError(f"source_type cannot be: {source_type}")
    
    if source_value is None:
        raise ValueError(f"source_value cannot be empty")
    
    source = NetworkInterfaceSource(type=source_type, value=source_value) # type: ignore

    return MachineNetworkInterface(
        # name=target,
        source=source
    )


def parse_machine_graphics(graphics_element: ET.Element) -> MachineGraphicalFramebuffer:
    """
    Parse <graphics> element back into MachineGraphicalFramebuffer model.
    """
    allowed_types = ["rdp", "vnc"]
    allowed_listen_types = ["network", "address"]
    
    type = get_required_xml_tag_attribute(graphics_element, "type")
    
    if type not in allowed_types:
        raise ValueError(f"Graphical framebuffer must be either 'rdp' or 'vnc' and not {type}.")
    
    autoport = get_required_xml_tag_attribute(graphics_element, "autoport")

    port = graphics_element.get("port")

    listen_network = None
    listen_address = None

    listen_el = get_required_xml_tag(graphics_element, "listen")
    listen_type = get_required_xml_tag_attribute(listen_el, "type")
    
    if listen_type not in allowed_listen_types:
        raise ValueError(f"listen_type must be either 'network' or 'address' and not {listen_type}.")
    
    listen_network = listen_el.get("network")
    listen_address = listen_el.get("address")

    return MachineGraphicalFramebuffer(
        type = type, # type: ignore
        port = port,
        autoport = True if autoport == "yes" else False,
        listen_type = listen_type, # type: ignore
        listen_network = listen_network,
        listen_address = listen_address,
    )


def parse_machine_xml(machine_xml: str) -> MachineParameters:
    """
    Gets XML string and parses it back into a MachineParameters object.\n
    Only parses elements that exist in MachineParameters model.
    """
    try:
        domain = ET.fromstring(machine_xml)
        
        uuid = UUID(get_required_xml_tag_text(domain, "uuid"))
        title = get_required_xml_tag_text(domain, "title")
        description = get_required_xml_tag_text(domain, "description")


        metadata = []
        ordinal_number = None
        
        metadata_el = get_required_xml_tag(domain, "metadata/vm:info", {"vm": "http://example.com/virtualization"})
        
        for child_metadata in metadata_el:
            # strip namespace element
            tag = child_metadata.tag.split("}", 1)[-1]  
            
            if child_metadata.text is not None:
                if tag == "ordinal_number":
                    ordinal_number = int(child_metadata.text)
                else:
                    metadata.append(MachineMetadata(tag=tag, value=child_metadata.text))

        if ordinal_number is None:
            raise ValueError("No ordinal number found in doman XML.")

        ram = int(get_required_xml_tag_text(domain, "memory"))
        vcpu = int(get_required_xml_tag_text(domain, "vcpu"))


        devices_el = get_required_xml_tag(domain, "devices")
        system_disk = None
        additional_disks = []

        # Disks
        
        iso_image = None
        
        for disk_element in devices_el.findall("disk"):
            device_type = get_required_xml_tag_attribute(disk_element, "device")
            
            if device_type == "cdrom":
                source_element = get_required_xml_tag(disk_element, "source")
                if "pool" in source_element.attrib and "volume" in source_element.attrib:
                    allowed_pool_types = ["cvms-disk-images", "cvms-iso-images", "cvms-network-filesystems"]
                    pool = get_required_xml_tag_attribute(source_element, "pool")
                    if pool not in allowed_pool_types:
                        raise ValueError(f"pool cannot be {pool}")
                    
                    iso_image = StoragePool(
                        pool = get_required_xml_tag_attribute(source_element, "pool"), # type: ignore
                        volume = get_required_xml_tag_attribute(source_element, "volume")
                    )
            else:
                try:    
                    boot_element = get_required_xml_tag(disk_element, "boot")
                    if get_required_xml_tag_attribute(boot_element, "order") == "1":
                        system_disk = parse_machine_disk(disk_element)
                except Exception:
                    additional_disks.append(parse_machine_disk(disk_element))
        
        if system_disk is None:
            raise ValueError("No system disk found in domain XML (missing <boot order='1'>).")

        # Network interfaces
        network_interfaces = []
        for iface_element in devices_el.findall("interface"):
            network_interfaces.append(parse_machine_network_interface(iface_element))
        
        # Internet access
        internet_connectivity = False
        
        for interface in network_interfaces:
            if interface.name == InternetInterface().name:
                internet_connectivity = True

        # Framebuffer
        graphics_element = get_required_xml_tag(devices_el, "graphics")
        framebuffer = parse_machine_graphics(graphics_element)

        assigned_clients_query = select_rows("SELECT client_uuid FROM deployed_machines_clients WHERE machine_uuid = %s", (uuid,))
        
        assigned_clients = {row["client_uuid"] for row in assigned_clients_query}
        
        return MachineParameters(
            uuid=uuid,
            title=title,
            ordinal_number=ordinal_number,
            description=description,
            metadata=metadata if metadata else None,
            ram=ram,
            vcpu=vcpu,
            system_disk=system_disk,
            additional_disks=additional_disks if additional_disks else None,
            iso_image=iso_image,
            network_interfaces=network_interfaces if network_interfaces else None,
            internet_connectivity=internet_connectivity,
            framebuffer=framebuffer,
            assigned_clients=assigned_clients
        )   
    except ValueError as e:
        raise ValueError(f"Failed to parse machine XML: {e}")
