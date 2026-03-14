-- Tribe swap: reassign players to new tribes
DO $$
DECLARE
  s50 uuid;
BEGIN
  SELECT id INTO s50 FROM seasons WHERE season_number = 50 LIMIT 1;
  IF s50 IS NULL THEN RETURN; END IF;

  -- Cila — Orange
  UPDATE players SET tribe = 'Cila', tribe_color = '#FF6B35'
    WHERE season_id = s50 AND (
      name IN ('Rizo Velovic', 'Cirie Fields', 'Kamilla Karthigesu',
               'Rick Devens', 'Charlie Davis', 'Jonathan Young')
      OR slug = 'dee-valladres'
    );

  -- Kalo — Teal
  UPDATE players SET tribe = 'Kalo', tribe_color = '#4A90D9'
    WHERE season_id = s50 AND (
      name IN ('Aubry Bracco', 'Colby Donaldson', 'Chrissy Hofbeck',
               'Tiffany Ervin', 'Genevieve Mushaluk', 'Joe Hunter')
      OR slug = 'benjamin-coach-wade'
    );

  -- Vatu — Purple
  UPDATE players SET tribe = 'Vatu', tribe_color = '#9B59B6'
    WHERE season_id = s50 AND name IN (
      'Mike White', 'Stephenie LaGrossa Kendrick', 'Angelina Keeley',
      'Q Burdette', 'Christian Hubicki', 'Ozzy Lusth',
      'Emily Flippen'
    );
END $$;
