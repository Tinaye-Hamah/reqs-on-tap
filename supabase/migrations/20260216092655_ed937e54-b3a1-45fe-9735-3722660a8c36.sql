
-- Delete non-CEO auth users
DELETE FROM auth.users WHERE id IN (
  '783f9089-cbdb-4c42-b964-f050d9e6ce3e',
  '4455bfd0-b7e0-4144-b440-6d98cb26892e',
  '9715494a-7529-402c-8b6f-f1d737608e5a',
  'f8ac574f-896e-4622-8935-920d49004935'
);
