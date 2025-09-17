-- =========================================================
-- MOCK DATA
-- =========================================================

-- 1) Three collections
INSERT INTO Bilduma (id, name, create_date, update_date) VALUES
  (1, 'Euskal Literatura',      '2023-10-01', '2023-10-01'),
  (2, 'Software Dokumentazioa', '2024-02-15', '2023-10-01'),
  (3, 'Azterketa-gidak',        '2024-06-10', '2023-10-01');

-- 2) Nine files (3 per collection)
INSERT INTO Fitxategia (name, text, charNum, format, bilduma_key) VALUES
  -- Euskal Literatura
  ('txalaparta-sinfonia.pdf', 'Txalaparta musika tresna bat da...', 432, 'PDF', 1),
  ('bertsoak.txt',            'Bertsoak ahozko inprobisazioa dira...', 312, 'TXT', 1),
  ('euskal_ahozko_onddoak.srt', '1\n00:00:00,000 --> 00:00:02,000\nOngi etorri...', 128, 'SRT', 1),

  -- Software Dokumentazioa
  ('api_spec.pdf',            'API dokumentazio osoa...', 2048, 'PDF', 2),
  ('readme.txt',              'Proiektuaren deskribapena...', 956, 'TXT', 2),
  ('setup_guide.docx',        'Instalazio urratsak...', 1024, 'DOCX', 2),

  -- Azterketa-gidak
  ('db_laburpena.doc',        'Datu-base azterketa laburpena...', 743, 'DOC', 3),
  ('timeline_2025.pdf',       'Ikasturteko timeline-a...', 612, 'PDF', 3),
  ('ohiko_galderak.txt',      'FAQ azken azterketarako...', 389, 'TXT', 3);

-- 3) Nine notes (3 per collection, different types)
INSERT INTO Nota (name, description, type, bilduma_key) VALUES
  -- Euskal Literatura
  ('Literatura laburpena', 'laburpena', '', 1),
  ('Literatura timeline',  'timeline', '', 1),
  ('Literatura FAQ',       'FAQ', '', 1),

  -- Software Dokumentazioa
  ('API gida',             'gida', '', 2),
  ('Setup mindmap',        'mindmap', '', 2),
  ('Release notes',        'nota', '', 2),

  -- Azterketa-gidak
  ('DB azterketa-gida',    'gida', '', 3),
  ('Timeline 2025',        'timeline', '', 3),
  ('Ohiko galderak',       'FAQ', '', 3);