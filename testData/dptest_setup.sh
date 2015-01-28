psql -U dronepass -d dronepasstest -c 'DROP TABLE drone, drone_operator, drone_position, flight_path, flight_path_area, land_owner, landing_zone, owned_parcel, restriction_exemption CASCADE;'
#psql -U dronepass -d dronepasstest -c 'create schema public;'
#psql --set ON_ERROR_STOP=on -U dronepass -d dronepasstest -f ./testData/parcel_v1_with_index.sql
echo ADD TABLE
psql --set ON_ERROR_STOP=on -U dronepass -d dronepasstest -f ./testData/Drone_Pass_Control_create.sql
echo ADD TEST DATA
psql --set ON_ERROR_STOP=on -U dronepass -d dronepasstest -f ./testData/test_data_create.sql