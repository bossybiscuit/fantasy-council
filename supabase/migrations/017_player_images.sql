-- Set img_url for each castaway based on their first name.
-- Images are served from /public/cast/ in the Next.js app.

UPDATE players SET img_url = '/cast/Angelina.webp' WHERE name ILIKE 'Angelina%';
UPDATE players SET img_url = '/cast/Aubry.webp'    WHERE name ILIKE 'Aubry%';
UPDATE players SET img_url = '/cast/Benjamin.webp' WHERE name ILIKE 'Benjamin%';
UPDATE players SET img_url = '/cast/Charlie.webp'  WHERE name ILIKE 'Charlie%';
UPDATE players SET img_url = '/cast/Chrissy.webp'  WHERE name ILIKE 'Chrissy%';
UPDATE players SET img_url = '/cast/Christian.webp'WHERE name ILIKE 'Christian%';
UPDATE players SET img_url = '/cast/Cirie.webp'    WHERE name ILIKE 'Cirie%';
UPDATE players SET img_url = '/cast/Colby.webp'    WHERE name ILIKE 'Colby%';
UPDATE players SET img_url = '/cast/Dee.webp'      WHERE name ILIKE 'Dee%';
UPDATE players SET img_url = '/cast/Emily.webp'    WHERE name ILIKE 'Emily%';
UPDATE players SET img_url = '/cast/Genevieve.webp'WHERE name ILIKE 'Genevieve%';
UPDATE players SET img_url = '/cast/Jenna.webp'    WHERE name ILIKE 'Jenna%';
UPDATE players SET img_url = '/cast/Joe.webp'      WHERE name ILIKE 'Joe%';
UPDATE players SET img_url = '/cast/Jonathan.webp' WHERE name ILIKE 'Jonathan%';
UPDATE players SET img_url = '/cast/Kamilla.webp'  WHERE name ILIKE 'Kamilla%';
UPDATE players SET img_url = '/cast/Kyle.webp'     WHERE name ILIKE 'Kyle%';
UPDATE players SET img_url = '/cast/Mike.webp'     WHERE name ILIKE 'Mike%';
UPDATE players SET img_url = '/cast/Ozzy.webp'     WHERE name ILIKE 'Ozzy%';
UPDATE players SET img_url = '/cast/Q.webp'        WHERE name ILIKE 'Q%';
UPDATE players SET img_url = '/cast/Rick.webp'     WHERE name ILIKE 'Rick%';
UPDATE players SET img_url = '/cast/Rizo.webp'     WHERE name ILIKE 'Rizo%';
UPDATE players SET img_url = '/cast/Savannah.webp' WHERE name ILIKE 'Savannah%';
UPDATE players SET img_url = '/cast/Stephenie.webp'WHERE name ILIKE 'Stephenie%';
UPDATE players SET img_url = '/cast/Tiffany.webp'  WHERE name ILIKE 'Tiffany%';
