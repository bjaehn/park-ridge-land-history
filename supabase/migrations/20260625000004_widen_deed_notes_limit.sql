-- Widen deed_notes character limit from 1000 to 5000.
-- Deed legal descriptions routinely exceed 1000 characters.
ALTER TABLE parcels DROP CONSTRAINT IF EXISTS parcels_deed_notes_check;
ALTER TABLE parcels ADD CONSTRAINT parcels_deed_notes_check CHECK (char_length(deed_notes) <= 5000);
