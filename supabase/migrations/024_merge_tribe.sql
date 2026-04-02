-- Post-merge: all active players move to a single merged tribe
DO $$
DECLARE
  s50 uuid;
BEGIN
  SELECT id INTO s50 FROM seasons WHERE season_number = 50 LIMIT 1;
  IF s50 IS NULL THEN RETURN; END IF;

  UPDATE players SET tribe = 'Merged Tribe', tribe_color = '#D4AF37'
    WHERE season_id = s50 AND is_active = true;
END $$;
