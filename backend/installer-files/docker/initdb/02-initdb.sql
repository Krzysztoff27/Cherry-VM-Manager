CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clients and Administrators
CREATE TABLE administrators (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(24) UNIQUE NOT NULL,
    password VARCHAR(60) NOT NULL,
    name VARCHAR(50),
    surname VARCHAR(50),
    email VARCHAR(255) UNIQUE,
    creation_date DATE NOT NULL DEFAULT current_date,
    last_active TIMESTAMP,
    disabled BOOLEAN DEFAULT FALSE
);

CREATE TABLE clients (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(24) UNIQUE NOT NULL,
    password VARCHAR(60) NOT NULL,
    name VARCHAR(50),
    surname VARCHAR(50),
    email VARCHAR(255) UNIQUE,
    creation_date DATE NOT NULL DEFAULT current_date,
    last_active TIMESTAMP,
    disabled BOOLEAN DEFAULT FALSE
);

CREATE TABLE roles (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE,
    permissions INT DEFAULT 0
);

CREATE TABLE groups (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE
);

CREATE TABLE administrators_roles (
    administrator_uuid UUID,
    role_uuid UUID,
    PRIMARY KEY(administrator_uuid, role_uuid),
    FOREIGN KEY(administrator_uuid) REFERENCES administrators(uuid) ON DELETE CASCADE,
    FOREIGN KEY(role_uuid) REFERENCES roles(uuid) ON DELETE CASCADE
);

CREATE TABLE clients_groups (
    client_uuid UUID,
    group_uuid UUID,
    PRIMARY KEY(client_uuid, group_uuid),
    FOREIGN KEY(client_uuid) REFERENCES clients(uuid) ON DELETE CASCADE,
    FOREIGN KEY(group_uuid) REFERENCES groups(uuid) ON DELETE CASCADE
);

-- Machines
CREATE TABLE deployed_machines_owners (
    machine_uuid UUID PRIMARY KEY,
    owner_uuid UUID,
    started_at TIMESTAMP,
    FOREIGN KEY(owner_uuid) REFERENCES administrators(uuid) ON DELETE CASCADE
);

CREATE TABLE deployed_machines_clients (
    machine_uuid UUID,
    client_uuid UUID,
    PRIMARY KEY(machine_uuid, client_uuid),
    FOREIGN KEY(machine_uuid) REFERENCES deployed_machines_owners(machine_uuid) ON DELETE CASCADE,
    FOREIGN KEY(client_uuid) REFERENCES clients(uuid) ON DELETE CASCADE
);

CREATE TABLE network_panel_states (
	owner_uuid UUID PRIMARY KEY,
	positions JSONB NOT NULL,
	FOREIGN KEY(owner_uuid) REFERENCES administrators(uuid) ON DELETE CASCADE
);

-- ISO Files, Machine Templates, Snapshots
CREATE TABLE iso_files (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(24) UNIQUE NOT NULL,
    remote BOOLEAN,
    file_name TEXT,
    file_location TEXT,
    file_size_bytes BIGINT DEFAULT 0,
    last_used TIMESTAMP,
    imported_by UUID,
    imported_at TIMESTAMP,
    last_modified_by UUID,
    last_modified_at TIMESTAMP,
    FOREIGN KEY(imported_by) REFERENCES administrators(uuid) ON DELETE CASCADE,
    FOREIGN KEY(last_modified_by) REFERENCES administrators(uuid) ON DELETE CASCADE
);

CREATE TABLE machine_templates (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_uuid UUID NOT NULL,
    name VARCHAR(24) UNIQUE NOT NULL,
    ram INT NOT NULL DEFAULT 0,
    vcpu INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY(owner_uuid) REFERENCES administrators(uuid) ON DELETE CASCADE

);

CREATE TABLE machine_snapshots (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_uuid UUID,
    name VARCHAR(24) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    size BIGINT DEFAULT 0,
    FOREIGN KEY(owner_uuid) REFERENCES administrators(uuid) ON DELETE CASCADE
);

CREATE TABLE machine_snapshots_shares (
    snapshot_uuid UUID,
    recipient_uuid UUID,
    PRIMARY KEY(snapshot_uuid, recipient_uuid),
    FOREIGN KEY(snapshot_uuid) REFERENCES machine_snapshots(uuid) ON DELETE CASCADE,
    FOREIGN KEY(recipient_uuid) REFERENCES administrators(uuid) ON DELETE CASCADE
);

-- Network Interfaces and Internal Networks
CREATE TABLE intnets (
    uuid UUID PRIMARY KEY,
    owner_uuid UUID,
    intnet_name VARCHAR(50),
    bridge_mac macaddr NOT NULL,
    bridge_ip inet,
    FOREIGN KEY(owner_uuid) REFERENCES administrators(uuid) ON DELETE CASCADE
);

CREATE TABLE intnets_connections (
    intnet_uuid UUID,
    machine_uuid UUID,
    interface_mac macaddr NOT NULL,
    interface_ip inet,
    PRIMARY KEY(intnet_uuid, machine_uuid, interface_mac),
    FOREIGN KEY (intnet_uuid) REFERENCES intnets(uuid) ON DELETE CASCADE,
    FOREIGN KEY (machine_uuid) REFERENCES deployed_machines_owners(machine_uuid) ON DELETE CASCADE
);

CREATE TABLE internet_connections(
    machine_uuid UUID PRIMARY KEY,
    interface_mac macaddr NOT NULL,
    FOREIGN KEY (machine_uuid) REFERENCES deployed_machines_owners(machine_uuid) ON DELETE CASCADE
);

CREATE TABLE network_panel_presets(
    uuid UUID PRIMARY KEY,
    owner_uuid UUID NOT NULL,
    name VARCHAR(50) NOT NULL,
    override_existing BOOLEAN NOT NULL,
    internal_network_profiles JSONB NOT NULL,
    FOREIGN KEY (owner_uuid) REFERENCES administrators(uuid) ON DELETE CASCADE
);

-- Machine Naming
CREATE TABLE machine_name_counters (
    owner_uuid UUID NOT NULL,
    name VARCHAR(50) NOT NULL,
    free_ids INT[] NOT NULL,
    current_max INT NOT NULL DEFAULT 0,
    PRIMARY KEY(owner_uuid, name),
    FOREIGN KEY (owner_uuid) REFERENCES administrators(uuid) ON DELETE CASCADE
);

-- Indices
CREATE INDEX administrators_idx ON administrators (uuid, username, email);
CREATE INDEX clients_idx ON clients (uuid, username, email);
CREATE INDEX roles_idx ON roles (uuid, name);
CREATE INDEX groups_idx ON groups (uuid, name);
CREATE INDEX administrators_roles_idx ON administrators_roles (administrator_uuid, role_uuid);
CREATE INDEX clients_groups_idx ON clients_groups (client_uuid, group_uuid);
CREATE INDEX deployed_machines_owner_idx ON deployed_machines_owners(machine_uuid, owner_uuid);
CREATE INDEX deployed_machines_clients_idx ON deployed_machines_clients(machine_uuid, client_uuid);
CREATE INDEX network_panel_states_idx ON network_panel_states(owner_uuid);
CREATE INDEX machine_snapshots_idx ON machine_snapshots(uuid, owner_uuid);
CREATE INDEX machine_snapshots_shares_idx ON machine_snapshots_shares(snapshot_uuid, recipient_uuid);
CREATE INDEX iso_files_idx ON iso_files (uuid, name);
CREATE INDEX intnets_idx ON intnets (uuid, owner_uuid, intnet_name);
CREATE INDEX intnets_connections_idx ON intnets_connections (intnet_uuid, machine_uuid, interface_mac);
CREATE INDEX internet_connections ON internet_connections (machine_uuid, interface_mac);
CREATE INDEX network_panel_presets_idx ON network_panel_presets(uuid, owner_uuid);
CREATE INDEX machine_name_counters_idx ON machine_name_counters(owner_uuid, name);


-- Insert roles
INSERT INTO roles (name, permissions)
VALUES 
    ('Machine Observer', 1),
    ('Machine Manager', 3),
    ('Client Accounts Manager', 4),
    ('Administrative Accounts Manager', 8),
    ('Global Accounts Manager', 12),
    ('Client Credentials Manager', 16),
    ('Administrative Credentials Manager', 32),
    ('Global Credentials Manager', 48),
    ('ISO File Manager', 64),
    ('System Resources Administrator', 128);

-- Insert root administrator
INSERT INTO administrators (uuid, username, password)
VALUES 
    ('83212b1e-b222-4bba-a1d4-450e08cbbeb1', 'root', '$2b$12$GNkVdiV24DIhBWYssz0H9.22nhoI1EuT9TNXRpwUHOCRKyKa7.wfS');

-- Insert corresponding guacamole_entity and guacamole_user records to allow for one-to-one user mapping
INSERT INTO guacamole_entity (name, type)
VALUES
    ('83212b1e-b222-4bba-a1d4-450e08cbbeb1', 'USER');

INSERT INTO guacamole_user (entity_id, password_hash, password_date, disabled, expired) 
VALUES
    (
        (SELECT entity_id FROM guacamole_entity WHERE name = '83212b1e-b222-4bba-a1d4-450e08cbbeb1'), 
        '', 
        NOW(), 
        FALSE, 
        FALSE);

-- Assign roles to root administrator
INSERT INTO administrators_roles (administrator_uuid, role_uuid)
SELECT 
    '83212b1e-b222-4bba-a1d4-450e08cbbeb1',
    uuid
FROM roles
WHERE name IN ('Machine Manager', 'Global Accounts Manager', 'Global Credentials Manager', 'ISO File Manager', 'System Resources Administrator');

