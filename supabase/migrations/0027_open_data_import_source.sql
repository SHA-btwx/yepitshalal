-- Listings built by the catalogue pipeline (scripts/catalogue) combine the FSA
-- register, OpenStreetMap and Overture Maps. None of the existing values
-- describes that honestly: it is not only an FSA import, not only an OSM
-- import, and not a partner feed. Provenance per listing lives in
-- restaurant_source_links; this value just says how the row was created.

alter type data_source_type add value if not exists 'open_data_import';
