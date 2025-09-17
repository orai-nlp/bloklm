import backend.blok_app.resource_generation as resgen

def generate_summary_task(llm, db, collection_id, file_ids, custom_conf):
    res_content = resgen.generate_summary(llm, db, collection_id, file_ids, custom_conf)
    db.create_note("", "summary", res_content, collection_id)

def generate_faq_task(llm, db, collection_id, file_ids, custom_conf):
    res_content = resgen.generate_faq(llm, db, collection_id, file_ids, custom_conf)
    db.create_note("", "faq", res_content, collection_id)

def generate_glossary_task(llm, db, collection_id, file_ids, custom_conf):
    res_content = resgen.generate_glossary(llm, db, collection_id, file_ids, custom_conf)
    db.create_note("", "glossary", res_content, collection_id)

def generate_outline_task(llm, db, collection_id, file_ids, custom_conf):
    res_content = resgen.generate_outline(llm, db, collection_id, file_ids, custom_conf)
    db.create_note("", "outline", res_content, collection_id)

def generate_chronogram_task(llm, db, collection_id, file_ids, custom_conf):
    res_content = resgen.generate_chronogram(llm, db, collection_id, file_ids, custom_conf)
    db.create_note("", "chronogram", res_content, collection_id)

def generate_mind_map_task(llm, db, collection_id, file_ids, custom_conf):
    res_content = resgen.generate_mind_map(llm, db, collection_id, file_ids, custom_conf)
    db.create_note("", "mindmap", res_content, collection_id)

def generate_podcast_task(llm, db, collection_id, file_ids, custom_conf):
    res_content = resgen.generate_podcast_script(llm, db, collection_id, file_ids, custom_conf)
