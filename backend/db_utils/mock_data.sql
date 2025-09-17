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
INSERT INTO Note (name, type, content, bilduma_key) VALUES
  -- Euskal Literatura
  ('Literatura laburpena', 'summary', 'This note provides a brief summary of Basque literature, highlighting major works and authors.', 1),
  ('Literatura timeline',  'timeline', 'A chronological overview of significant events and publications in Basque literature.', 1),
  ('Literatura FAQ',       'FAQ',      'Frequently asked questions about Basque literature, including common terms and authors.', 1),

  -- Software Dokumentazioa
  ('API gida',             'outline',  'Step-by-step guide outlining the API endpoints, request formats, and usage examples.', 2),
  ('Setup mindmap',        'mindmap',  'Visual mindmap showing the setup process for the software, including dependencies and configurations.', 2),
  ('Release notes',        'summary',  'Summary of the latest software release, including new features, bug fixes, and known issues.', 2),

  -- Azterketa-gidak
  ('DB azterketa-gida',    'outline',  'Comprehensive study guide for database exams, covering key concepts and sample questions.', 3),
  ('Timeline 2025',        'timeline', 'Timeline of important academic events and deadlines for the year 2025.', 3),
  ('Ohiko galderak',       'FAQ',      'Common questions and answers related to exam preparation and study techniques.', 3);
