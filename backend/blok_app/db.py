import psycopg2
from collections import namedtuple
import datetime
import sys
sys.path.insert(0, "../..")
from backend.config import DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
import os
from pdb import set_trace as d
from backend.blok_app.document_parser_backend_ocr import extract_from_documents


###################################################################################
    #########################      LAGUNTZAILEAK       ############################
###################################################################################

"""
    'PDF', 'TXT', 'DOC', 'DOCX', 'SRT'
"""
format_mapping = {
    "application/pdf":"PDF",
    "text/plain":"TXT",
    "application/doc": "DOC",
    "application/docx": "DOCX",
    "application/srt": "SRT",
    }

file_type = {
    ".docx":"DOCX",
    ".pdf":"PDF",
}

###################################################################################
    #########################      GENERIKOAK       ############################
###################################################################################

def get_db():
    """
    Opens a new psycopg2 connection and returns it.
    Caller must close it: conn.close()
    """
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname= DB_NAME
    )

def query_db(query, args = ()):
    conn = get_db()
    cur = conn.cursor()
    print("Query: ",query)
    presql=datetime.datetime.now()
    cur.execute(query, args)
    postsql=datetime.datetime.now()
    print("PostgreSQL: fetched results in: ",postsql-presql)          
    result = namedtuplefetchall(cur)
    postsql2=datetime.datetime.now()
    print("PostgreSQL: prepared results in tuples: ",postsql2-postsql)
    cur.close()
    conn.close()
    return result

def commit_query_db(query, params = None):
    try:
        conn = get_db()
        cur = conn.cursor()
        print("Query: ",query[:100])
        presql=datetime.datetime.now()
        cur.execute(query, params)
        conn.commit()
        postsql=datetime.datetime.now()
        print("PostgreSQL: commited succesfully the change: ",postsql-presql) 
        cur.close()
        conn.close()
    except Exception as exc:
        conn.rollback()
        print("Query failed:", exc)
        raise exc

        


def namedtuplefetchall(cursor):
    "Return all rows from a cursor as a namedtuple"
    desc = cursor.description
    fields=[col[0] for col in desc]        
    result_obj = namedtuple('rslt_obj', fields)
    result=[]
    while True:        
        row = cursor.fetchone()
        if not row:
            break
                            
        result.append(result_obj(*row))     
    return result


def sql_where_clause(params):
    whereclause = " where"
        
    if "bilduma_id" in params:
        whereclause += f" and B.id = {params['bilduma_id']}"
        
    if "fitxa_id" in params:
        whereclause += f" and F.id = {params['fitxa_id']}"

    return whereclause.replace("where and", "where")


def get_from_table(where_conditions, select_string="", source_info=False):
    """
        generate the "FROM" clause for the tables we have to query, taking into account the joins needed.
    """
    from_clause= "from Bilduma as B"
    # join with fitxategiak (Bilduma - Fitxategiak)
    if "fitxa" in select_string:
        from_clause+=" LEFT JOIN Fitxategia AS F ON F.bilduma_key = B.id" 

        
    print("db.get_from_table => ",from_clause)
    return from_clause

def query_db_as_dict(sql, args=(), one=False):
	sql_result=query_db(sql,args)    
	result = []
	for i in sql_result:
		result.append(i._asdict())
		
	print("QUERY_DB_AS_DICT- RESULT: ", sql_result)
	
	return result

###################################################################################
   ###########################      BILDUMAK       #############################
###################################################################################

def get_bildumak():
    from_tables=get_from_table('',select_string='fitxa')
    query = "SELECT  B.id, B.name, B.title, B.summary, B.create_date::TEXT AS c_date, B.update_date::TEXT AS u_date, COUNT(F.id) AS fitxategia_count " + from_tables + " GROUP BY B.id, B.name, B.create_date, B.update_date"
    return query_db_as_dict(query)

def get_bilduma(id):
    bilduma_sql = f"SELECT id, name, title, summary, create_date::TEXT AS c_date, update_date::TEXT AS u_date FROM Bilduma WHERE id = {id};"
    return query_db_as_dict(bilduma_sql)

def create_bilduma(args):
    id = args["id"]
    title = args["title"]
    date = args["date"]
    q = f"INSERT INTO Bilduma (id, name, create_date, update_date) VALUES ({id}, '{title}', '{date}', '{date}');"
    commit_query_db(q)

def set_descriptors_to_bilduma(id, name, title, summary):
    q = "UPDATE Bilduma SET name = %s, title = %s, summary = %s where id = %s"
    commit_query_db(q, (name, title, summary, id))

def delete_bilduma(args):
    id = args["id"]
    q = f"DELETE FROM Bilduma WHERE id = {id};"
    commit_query_db(q)

def rename_bilduma(args):
    id = args["id"]
    title = args['title']
    q = f"UPDATE Bilduma SET name = '{title}', update_date = CURRENT_DATE WHERE id = {id};"
    commit_query_db(q)

def set_chat_id(nt_id, chat_id):
    q = "UPDATE Bilduma SET chat_id = %s WHERE id = %s;"
    commit_query_db(q, (chat_id, nt_id))

def get_chat_id(nt_id):
    q = f"SELECT chat_id FROM Bilduma WHERE id = {nt_id};"
    return query_db_as_dict(q)

###################################################################################
  ########################       FITXATEGIAK        #############################
###################################################################################

def get_fitxategiak(collection_id, content=False, file_ids=[]):
    args = []
    filter_collection = f"bilduma_key = {collection_id}"
    filter_files = ""
    if file_ids:
        filter_files = "AND id = ANY(%s)"
        args.append(file_ids)
    select_content = ""
    if content:
        select_content = ", text"
    notak_sql = f"SELECT id, name, format {select_content} FROM Fitxategia WHERE {filter_collection} {filter_files};"
    return query_db_as_dict(notak_sql, args=tuple(args))

def get_fitxategia(id):
    notak_sql = f"SELECT id, name, text, charNum, format, type FROM Fitxategia WHERE id = {id};"
    return query_db_as_dict(notak_sql)

def upload_fitxategiak(id: str, files):
    """
    Save every uploaded file for the given notebook.
    files: list of Sanic File objects (f.name, f.body, f.type)
    """

    # --- Parse text using the unchanged parser ---
    try:
        parsed_files = extract_from_documents(files)
    except Exception as e:
        raise f'Error: Extracting content from files; {str(e)}'
    try:
        for parsed in parsed_files:
            
            if not parsed['success']:
                # handle / log error
                raise Exception('The file could not be properly read.')
            
            # --- Insert into DB ---
            q = "INSERT INTO Fitxategia (name, text, charNum, format, bilduma_key) VALUES (%s, %s, %s, %s, %s)"
            params = (parsed['filename'], parsed['text'], len(parsed['text']), file_type[parsed['file_type']] if parsed['file_type'] in file_type else parsed['file_type'], id)
            commit_query_db(q, params)
    
    except Exception as e:
        raise f'Error: Saving the files in database; {str(e)}'

    return parsed_files
###################################################################################
    ###########################      NOTAK       #############################
###################################################################################

def get_notes(collection_id):
    sql = f"SELECT id, name, description, type FROM Note WHERE bilduma_key = {collection_id};"
    return query_db_as_dict(sql)

def get_note(note_id):
    sql = f"SELECT id, name, description, type FROM Note WHERE id = {id};"
    return query_db_as_dict(sql)

def create_note(name, note_type, content, collection_id):
    sql = f"INSERT INTO Note (name, type, content, bilduma_key) VALUES (%s, %s, %s, %s)"
    data = (name, note_type, content, collection_id)
    commit_query_db(sql, data)