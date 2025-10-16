import backend.blok_app.resource_generation as resgen

def generate_summary_task(llm, db, note_id, collection_id, file_ids, lang, custom_conf):
    res_content = resgen.generate_summary(llm, db, collection_id, file_ids, lang, custom_conf)
    title = resgen.generate_note_title(llm, db, "summary", res_content, lang, collection_id)
    db.update_note(note_id, title, res_content)

def generate_faq_task(llm, db, note_id, collection_id, file_ids, lang, custom_conf):
    res_content = resgen.generate_faq(llm, db, collection_id, file_ids, lang, custom_conf)
    title = resgen.generate_note_title(llm, db, "FAQ", res_content, lang, collection_id)
    db.update_note(note_id, title, res_content)

def generate_glossary_task(llm, db, note_id, collection_id, file_ids, lang, custom_conf):
    res_content = resgen.generate_glossary(llm, db, collection_id, file_ids, lang, custom_conf)
    title = resgen.generate_note_title(llm, db, "glossary", res_content, lang, collection_id)
    db.update_note(note_id, title, res_content)

def generate_outline_task(llm, db, note_id, collection_id, file_ids, lang, custom_conf):
    res_content = resgen.generate_outline(llm, db, collection_id, file_ids, lang, custom_conf)
    title = resgen.generate_note_title(llm, db, "outline", res_content, lang, collection_id)
    db.update_note(note_id, title, res_content)

def generate_chronogram_task(llm, db, note_id, collection_id, file_ids, lang, custom_conf):
    res_content = resgen.generate_chronogram(llm, db, collection_id, file_ids, lang, custom_conf)
    title = resgen.generate_note_title(llm, db, "timeline", res_content, lang, collection_id)
    db.update_note(note_id, title, res_content)

def generate_mind_map_task(llm, db, note_id, collection_id, file_ids, lang, custom_conf):
    res_content = resgen.generate_mind_map(llm, db, collection_id, file_ids, lang, custom_conf)
    title = resgen.generate_note_title(llm, db, "mindmap", res_content, lang, collection_id)
    db.update_note(note_id, title, res_content)

def generate_podcast_task(llm, db, note_id, collection_id, file_ids, lang, custom_conf):
    res_content = resgen.generate_podcast_script(llm, db, collection_id, file_ids, lang, custom_conf)
