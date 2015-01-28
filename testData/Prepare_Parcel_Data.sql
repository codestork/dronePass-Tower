-- THIS ASSUMES YOU"VE ALREADY ADDED THE PARCEL DATA USING shp2pgsql
-- it's nicer to not repeat the ALTER TABLE public.parcel line,
-- but repeating it prevents stopping the drop process if one
-- table has already been dropped elsewhere
ALTER TABLE public.parcel DROP COLUMN book;
ALTER TABLE public.parcel DROP COLUMN page;
ALTER TABLE public.parcel DROP COLUMN parcel;
ALTER TABLE public.parcel DROP COLUMN sub_parcel;
ALTER TABLE public.parcel DROP COLUMN clca_categ;
ALTER TABLE public.parcel DROP COLUMN comments;
ALTER TABLE public.parcel DROP COLUMN date_creat;
ALTER TABLE public.parcel DROP COLUMN date_updat;
ALTER TABLE public.parcel DROP COLUMN editor;
ALTER TABLE public.parcel DROP COLUMN fid_parcel;
ALTER TABLE public.parcel DROP COLUMN centroid_x;
ALTER TABLE public.parcel DROP COLUMN centroid_y;
ALTER TABLE public.parcel DROP COLUMN shape_star;
ALTER TABLE public.parcel DROP COLUMN shape_stle;
ALTER TABLE public.parcel DROP COLUMN shape_st_1;
ALTER TABLE public.parcel DROP COLUMN shape_st_2;
ALTER TABLE public.parcel DROP COLUMN shape_st_3;
ALTER TABLE public.parcel DROP COLUMN shape_st_4;

ALTER TABLE public.parcel 
ADD COLUMN height int NOT NULL DEFAULT 0;

ALTER TABLE public.parcel_wgs84 DROP COLUMN book;
ALTER TABLE public.parcel_wgs84 DROP COLUMN page;
ALTER TABLE public.parcel_wgs84 DROP COLUMN parcel;
ALTER TABLE public.parcel_wgs84 DROP COLUMN sub_parcel;
ALTER TABLE public.parcel_wgs84 DROP COLUMN clca_categ;
ALTER TABLE public.parcel_wgs84 DROP COLUMN comments;
ALTER TABLE public.parcel_wgs84 DROP COLUMN date_creat;
ALTER TABLE public.parcel_wgs84 DROP COLUMN date_updat;
ALTER TABLE public.parcel_wgs84 DROP COLUMN editor;
ALTER TABLE public.parcel_wgs84 DROP COLUMN fid_parcel;
ALTER TABLE public.parcel_wgs84 DROP COLUMN centroid_x;
ALTER TABLE public.parcel_wgs84 DROP COLUMN centroid_y;
ALTER TABLE public.parcel_wgs84 DROP COLUMN shape_star;
ALTER TABLE public.parcel_wgs84 DROP COLUMN shape_stle;
ALTER TABLE public.parcel_wgs84 DROP COLUMN shape_st_1;
ALTER TABLE public.parcel_wgs84 DROP COLUMN shape_st_2;
ALTER TABLE public.parcel_wgs84 DROP COLUMN shape_st_3;
ALTER TABLE public.parcel_wgs84 DROP COLUMN shape_st_4;

ALTER TABLE public.parcel_wgs84 
ADD COLUMN height int NOT NULL DEFAULT 0;

--create parcel index by geometry
CREATE INDEX parcel_gidx ON public.parcel USING GIST ( lot_geom );
VACUUM ANALYZE public.parcel;
--THIS MIGHT BE OVERKILL
CLUSTER public.parcel USING parcel_gidx;
--not sure if this ANALYZE CALL IS NECESSARY
ANALYZE public.parcel;
--CLUSTER public.parcel_wgs84 USING 