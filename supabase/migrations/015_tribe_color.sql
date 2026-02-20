-- ============================================================
-- Add tribe_color column and populate Season 50 tribe data
-- ============================================================

ALTER TABLE players ADD COLUMN IF NOT EXISTS tribe_color text;

-- Season 50 tribe assignments
-- Run after the column is added; uses slug to target each player.
-- The subquery finds the Season 50 season_id dynamically.

DO $$
DECLARE
  s50 uuid;
BEGIN
  SELECT id INTO s50 FROM seasons WHERE season_number = 50 LIMIT 1;
  IF s50 IS NULL THEN RETURN; END IF;

  -- Cila — Orange
  UPDATE players SET tribe = 'Cila', tribe_color = '#FF6B35'
    WHERE season_id = s50 AND slug IN (
      'christian-hubicki','cirie-fields','emily-flippen',
      'jenna-lewis-dougherty','joe-hunter','ozzy-lusth',
      'rick-devens','savannah-louie'
    );

  -- Kalo — Blue
  UPDATE players SET tribe = 'Kalo', tribe_color = '#4A90D9'
    WHERE season_id = s50 AND slug IN (
      'charlie-davis','chrissy-hofbeck','benjamin-coach-wade',
      'dee-valladres','jonathan-young','kamilla-karthigesu',
      'mike-white','tiffany-ervin'
    );

  -- Vatu — Purple
  UPDATE players SET tribe = 'Vatu', tribe_color = '#9B59B6'
    WHERE season_id = s50 AND slug IN (
      'angelina-keeley','aubry-bracco','colby-donaldson',
      'genevieve-mushaluk','kyle-fraser','q-burdette',
      'rizo-velovic','stephenie-lagrossa-kendrick'
    );
END $$;
