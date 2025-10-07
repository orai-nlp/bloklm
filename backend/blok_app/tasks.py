import backend.blok_app.resource_generation as resgen

def generate_summary_task(llm, db, note_id, collection_id, file_ids, custom_conf):
    res_content = resgen.generate_summary(llm, db, collection_id, file_ids, custom_conf)
    db.update_note(note_id, "summary note", res_content)

def generate_faq_task(llm, db, note_id, collection_id, file_ids, custom_conf):
    res_content = resgen.generate_faq(llm, db, collection_id, file_ids, custom_conf)
    db.update_note(note_id, "FAQ note", res_content)

def generate_glossary_task(llm, db, note_id, collection_id, file_ids, custom_conf):
    res_content = resgen.generate_glossary(llm, db, collection_id, file_ids, custom_conf)
    db.update_note(note_id, "glossary note", res_content)

def generate_outline_task(llm, db, note_id, collection_id, file_ids, custom_conf):
    res_content = resgen.generate_outline(llm, db, collection_id, file_ids, custom_conf)
    db.update_note(note_id, "outline note", res_content)

def generate_chronogram_task(llm, db, note_id, collection_id, file_ids, custom_conf):
    res_content = resgen.generate_chronogram(llm, db, collection_id, file_ids, custom_conf)
    db.update_note(note_id, "timeline note", res_content)

def generate_mind_map_task(llm, db, note_id, collection_id, file_ids, custom_conf):
    res_content = resgen.generate_mind_map(llm, db, collection_id, file_ids, custom_conf)
    db.update_note(note_id, "mindmap note", res_content)

def generate_podcast_task(llm, db, note_id, collection_id, file_ids, custom_conf):
    res_content = resgen.generate_podcast_script(llm, db, collection_id, file_ids, custom_conf)
