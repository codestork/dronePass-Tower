--Test Data Creation

-- DELETIONS MAY BE UNCESSARY

-- Test1
DELETE FROM drone WHERE call_sign='Test1';
INSERT INTO drone (call_sign, drone_type, max_velocity) 
VALUES ('Test1', 'Amazon', 10);

-- Test2
DELETE FROM drone WHERE call_sign='Test2';
INSERT INTO drone (call_sign, drone_type, max_velocity) 
VALUES ('Test2', 'Amazon', 10);

-- Test3
-- flight path {"type":"LineString","coordinates":[[1876586.3304232405,615035.1327080689],[1876888.2187762756,614824.4040113207]]}
-- restricted geometry
-- gid: 300058
-- apn: 513-200-2
-- apn_sort: 513 020000200
-- height: 0

-- drone
DELETE FROM drone WHERE call_sign='Test3';
INSERT INTO drone (call_sign, drone_type, max_velocity) 
VALUES ('Test3', 'Amazon', 10);

-- land owner
DELETE FROM land_owner WHERE login='Test3@Test3.Test3';
INSERT INTO land_owner (id, login) 
VALUES (3, 'Test3@Test3.Test3');

-- owned parcel
DELETE FROM owned_parcel WHERE land_owner_id=3;
INSERT INTO owned_parcel (hull_geom, land_owner_id, parcel_gid, restriction_start, restriction_end, restriction_height)
VALUES  (
            (SELECT ST_SetSRID(ST_ConvexHull(ST_COLLECT(p.lot_geom)), 102243)
                FROM parcel AS p
                WHERE apn='513-200-2')
            ,3 
            ,300058
            ,'04:05:06'
            ,'10:05:06'
            ,0
        );

DELETE FROM restriction_exemption WHERE drone_call_sign='Test3';
INSERT INTO restriction_exemption (drone_call_sign, owned_parcel_gid, exemption_start, exemption_end) 
VALUES ('Test3', (SELECT gid FROM owned_parcel WHERE land_owner_id=3), '1999-01-08 00:00:00', '1999-01-08 23:59:59');

-- Test4
-- flight path {"type":"LineString","coordinates":[[1877613.8620405402,614584.7430130504],[1877932.3029469794,614514.3159290175]]}
-- gid: 298678
-- apn: 513-200-3-17
-- apn_sort: 513 020000317
-- height: 0
-- drone
DELETE FROM drone WHERE call_sign='Test4';
INSERT INTO drone (call_sign, drone_type, max_velocity) 
VALUES ('Test4', 'Amazon', 10);

-- land owner
DELETE FROM land_owner WHERE login='Test4@Test4.Test4';
INSERT INTO land_owner (id, login) 
VALUES (4, 'Test4@Test4.Test4');

-- owned parcel
DELETE FROM owned_parcel WHERE land_owner_id=4;
INSERT INTO owned_parcel (hull_geom, land_owner_id, parcel_gid, restriction_start, restriction_end, restriction_height)
VALUES  (
            (SELECT ST_SetSRID(ST_ConvexHull(ST_COLLECT(p.lot_geom)), 102243)
                FROM parcel AS p
                WHERE apn='513-200-3-17')
            ,4
            ,298678
            ,'04:05:06'
            ,'10:05:06'
            ,0
        );


--Test5
-- flight path {"type":"LineString","coordinates":[[1874137.5293254459,615158.1254149019],[1874164.2087430754,614974.4686230642]]}
-- gid: 290859
-- apn: 513-616-3-6
-- apn_sort: 513 061600306
-- height: 0
-- gid: 299514
-- apn: 513-616-3-6
-- apn_sort: 513 061600306
-- height: 0
-- drone
DELETE FROM drone WHERE call_sign='Test5';
INSERT INTO drone (call_sign, drone_type, max_velocity) 
VALUES ('Test5', 'Amazon', 10);

-- land owner
DELETE FROM land_owner WHERE login='Test5@Test5.Test5';
INSERT INTO land_owner (id, login) 
VALUES (5, 'Test5@Test5.Test5');

-- owned parcel
DELETE FROM owned_parcel WHERE land_owner_id=5;
INSERT INTO owned_parcel (hull_geom, land_owner_id, parcel_gid, restriction_start, restriction_end, restriction_height)
VALUES  (
            (SELECT ST_SetSRID(ST_ConvexHull(ST_COLLECT(p.lot_geom)), 102243)
                FROM parcel AS p
                WHERE apn='513-616-3-6')
            ,5
            ,290859
            ,'04:05:06'
            ,'10:05:06'
            ,0
        );

DELETE FROM owned_parcel WHERE land_owner_id=5;
INSERT INTO owned_parcel (hull_geom, land_owner_id, parcel_gid, restriction_start, restriction_end, restriction_height)
VALUES  (
            (SELECT ST_SetSRID(ST_ConvexHull(ST_COLLECT(p.lot_geom)), 102243)
                FROM parcel AS p
                WHERE apn='513-616-3-6')
            ,5
            ,299514
            ,'04:05:06'
            ,'10:05:06'
            ,0
        );







-- DELETE FROM flight_path WHERE login='Test3@Test3.Test3';
-- INSERT INTO flight_path (drone_call_sign, flight_start, flight_end, path_geom) 
-- VALUES ('Test3','1999-01-08 04:05:06','1999-01-08 10:05:06',ST_SetSRID(ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[1886555.8045440218,614332.6659284362],[1886800.1148899796,612866.8038526904],[1888455.9961236925,613328.2789506103],[1887953.8026347796,612513.9111307516]]}'),102243));



-- INSERT INTO land_owner (id, login) VALUES (12345, 'yo@yo.yo');
-- INSERT INTO land_owner (id, login) VALUES (23456, 'bo@bo.bo');
-- INSERT INTO land_owner (id, login) VALUES (34567, 'mo@mo.mo');

    -- registerAddress(12345, 70371, '04:05:06', '10:05:06');
    -- registerAddress(23456, 70199, null, null);
    -- registerAddress(34567, 70640, '04:05:06', '10:05:06');
-- -- drone operator creation
-- INSERT INTO drone_operator (id, operator_name) VALUES (12345, 'Test');

-- --


-- INSERT INTO flight_path (drone_call_sign, flight_start, flight_end, path_geom) 
-- VALUES ('Test','1999-01-08 05:05:06','1999-01-08 04:05:06',ST_SetSRID(ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[1886555.8045440218,614332.6659284362],[1886800.1148899796,612866.8038526904],[1888455.9961236925,613328.2789506103],[1887953.8026347796,612513.9111307516]]}'),102243)) 
-- RETURNING gid;

-- INSERT INTO "owned_parcel" ("hull_geom", "land_owner_id", "parcel_gid", "restriction_end", "restriction_height", "restriction_start") 
-- values (
--  SELECT ST_SetSRID(ST_ConvexHull(ST_GeomFromText('MULTIPOLYGON(((1889059.7815404 612202.364785696,1889050.22850722 610986.579123968,1889047.98973325 610701.654880332,1888495.88581469 610699.811134061,1887955.78980236 610698.007613855,1887407.4547181 610696.176360874,1887399.97673107 609989.405925418,1885909.58589469 610050.008853518,1885880.07110165 610050.910149472,1885886.75690592 610732.541227517,1885854.02104931 611546.653914895,1885834.07793267 612081.3149989,1885833.57379176 612094.826509059,1885826.94770773 612272.469187984,1885836.83910401 613130.192114061,1885840.61285052 613861.79742655,1887445.83278331 613889.091702063,1887408.13747821 612247.098492011,1889059.7815404 612202.364785696),(1887158.07295012 611601.440579295,1887171.99747368 611611.228045342,1887229.68830534 611611.228045341,1887229.68830534 611653.389294723,1887207.48386492 611642.472559228,1887187.91415448 611637.955404069,1887169.84982721 611637.955404071,1887110.27745998 611677.857457012,1887091.46028642 611680.116034594,1887054.20271053 611657.906140451,1887158.07295012 611601.440579295)))')), 102243), 12345, 70371, '10:05:06', 0, '04:05:06' ]
--  )


-- INSERT INTO restriction_exemption (drone_call_sign, owned_parcel_gid, exemption_start, exemption_end) VALUES ('Test', 15, '1999-01-08 00:00:00', '1999-01-08 23:59:59');