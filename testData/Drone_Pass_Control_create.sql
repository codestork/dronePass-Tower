-- Created by Vertabelo (http://vertabelo.com)
-- Script type: create
-- Scope: [tables, references, sequences, views, procedures]
-- Generated at Thu Jan 08 16:07:28 UTC 2015




-- tables
-- Table: drone
CREATE TABLE drone (
    call_sign varchar(32)  NOT NULL,
    drone_type varchar(64)  NOT NULL,
    max_velocity int  NOT NULL,
    CONSTRAINT drone_pk PRIMARY KEY (call_sign)
);



-- Table: drone_operator
CREATE TABLE drone_operator (
    id serial  NOT NULL,
    operator_name varchar(128)  NULL,
    CONSTRAINT drone_operator_pk PRIMARY KEY (id)
);



-- Table: drone_position
CREATE TABLE drone_position (
    gid bigserial  NOT NULL,
    drone_call_sign varchar(32)  NOT NULL,
    heading int  NULL CHECK (heading > -1 AND heading < 360),
    epoch timestamp  NOT NULL,
    CONSTRAINT drone_position_pk PRIMARY KEY (gid)
);



-- Table: flight_path
CREATE TABLE flight_path (
    gid serial  NOT NULL,
    drone_call_sign varchar(32) UNIQUE NOT NULL,
    drone_operator_id int NOT NULL DEFAULT 0, --drone_operator_id int  NOT NULL,
    flight_start timestamp  NOT NULL DEFAULT '-infinity'::timestamp without time zone CHECK (flight_start < flight_end),
    flight_end timestamp  NOT NULL DEFAULT 'infinity'::timestamp without time zone CHECK (flight_start < flight_end),
    CONSTRAINT flight_path_pk PRIMARY KEY (gid)
);

CREATE UNIQUE INDEX ON flight_path (
    drone_call_sign
);


-- Table: flight_path_area
CREATE TABLE flight_path_area (
    gid serial  NOT NULL,
    flight_path_gid int UNIQUE NOT NULL,
    CONSTRAINT flight_path_area_pk PRIMARY KEY (gid)
);

CREATE UNIQUE INDEX ON flight_path_area (
    flight_path_gid
);

-- Table: land_owner
CREATE TABLE land_owner (
    id int  NOT NULL,
    login varchar(255) UNIQUE NOT NULL,
    owner_authority int  NOT NULL DEFAULT 0,
    CONSTRAINT land_owner_pk PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ON land_owner (
    login
);

-- Table: landing_zone
CREATE TABLE landing_zone (
    gid serial  NOT NULL,
    owned_parcel_gid int  NOT NULL,
    CONSTRAINT landing_zone_pk PRIMARY KEY (gid)
);



-- Table: owned_parcel
CREATE TABLE owned_parcel (
    gid serial  NOT NULL,
    land_owner_id int  NOT NULL,
    parcel_gid int UNIQUE NOT NULL,
    restriction_height int  NULL,
    restriction_start time  NULL CHECK(restriction_start < restriction_end),
    restriction_end time  NULL CHECK(restriction_start < restriction_end),
    CONSTRAINT owned_parcel_pk PRIMARY KEY (gid)
);

CREATE UNIQUE INDEX ON owned_parcel (
    parcel_gid
);

-- Table: restriction_exemption
CREATE TABLE restriction_exemption (
    id serial  NOT NULL,
    drone_call_sign varchar(32)  NOT NULL,
    owned_parcel_gid int  NOT NULL,
    exemption_start timestamp  NOT NULL DEFAULT '-infinity'::timestamp without time zone CHECK (exemption_start < exemption_end),
    exemption_end timestamp  NOT NULL DEFAULT 'infinity'::timestamp without time zone CHECK (exemption_start < exemption_end),    
    CONSTRAINT restriction_exemption_pk PRIMARY KEY (id)
);







-- foreign keys
-- Reference:  drone_position_drone (table: drone_position)


ALTER TABLE drone_position ADD CONSTRAINT drone_position_drone 
    FOREIGN KEY (drone_call_sign)
    REFERENCES drone (call_sign)
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE 
;

-- Reference:  edited_parcel_land_owner (table: owned_parcel)


ALTER TABLE owned_parcel ADD CONSTRAINT edited_parcel_land_owner 
    FOREIGN KEY (land_owner_id)
    REFERENCES land_owner (id)
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE 
;

-- Reference:  edited_parcel_parcel (table: owned_parcel)


ALTER TABLE owned_parcel ADD CONSTRAINT edited_parcel_parcel 
    FOREIGN KEY (parcel_gid)
    REFERENCES parcel (gid)
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE 
;

-- Reference:  flight_path_area_flight_path (table: flight_path_area)


ALTER TABLE flight_path_area ADD CONSTRAINT flight_path_area_flight_path 
    FOREIGN KEY (flight_path_gid)
    REFERENCES flight_path (gid)
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE 
;

-- Reference:  flight_path_drone (table: flight_path)


ALTER TABLE flight_path ADD CONSTRAINT flight_path_drone 
    FOREIGN KEY (drone_call_sign)
    REFERENCES drone (call_sign)
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE 
;

-- Reference:  flight_path_drone_operator (table: flight_path)


-- ALTER TABLE flight_path ADD CONSTRAINT flight_path_drone_operator 
--     FOREIGN KEY (drone_operator_id)
--     REFERENCES drone_operator (id)
--     NOT DEFERRABLE 
--     INITIALLY IMMEDIATE 
-- ;

-- Reference:  landing_zone_owned_parcel (table: landing_zone)


ALTER TABLE landing_zone ADD CONSTRAINT landing_zone_owned_parcel 
    FOREIGN KEY (owned_parcel_gid)
    REFERENCES owned_parcel (gid)
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE 
;

-- Reference:  restriction_exemption_drone (table: restriction_exemption)


ALTER TABLE restriction_exemption ADD CONSTRAINT restriction_exemption_drone 
    FOREIGN KEY (drone_call_sign)
    REFERENCES drone (call_sign)
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE 
;

-- Reference:  restriction_exemption_owned_parcel (table: restriction_exemption)


ALTER TABLE restriction_exemption ADD CONSTRAINT restriction_exemption_owned_parcel 
    FOREIGN KEY (owned_parcel_gid)
    REFERENCES owned_parcel (gid)
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE 
;




-- adds buffered geometry for parcel to test drone movements against
SELECT AddGeometryColumn('owned_parcel', 'hull_geom', 102243, 'POLYGON', 2, false);

-- landing zone as dictated by the pilot
SELECT AddGeometryColumn('landing_zone', 'zone_geom', 102243, 'POLYGON', 2, false);

-- position updates of the drone
SELECT AddGeometryColumn('drone_position', 'position_geom', 102243, 'POINT', 2, false);

-- flight path suggested by drone pilot and accepted by planner
SELECT AddGeometryColumn('flight_path', 'path_geom', 102243, 'LINESTRING', 2, false);

-- flight path buffered will be created server side after the flight path has been accepted by the server side 
SELECT AddGeometryColumn('flight_path_area', 'buffered_geom', 102243, 'POLYGON', 2, false);

-- End of file.

