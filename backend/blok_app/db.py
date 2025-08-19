import psycopg2
from collections import namedtuple
import datetime
import sys
sys.path.insert(0, "../")
from config import DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
import os
from pdb import set_trace as d
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

def commit_query_db(query):
    try:
        conn = get_db()
        cur = conn.cursor()
        print("Query: ",query)
        presql=datetime.datetime.now()
        cur.execute(query)
        conn.commit()
        postsql=datetime.datetime.now()
        print("PostgreSQL: commited succesfully the change: ",postsql-presql) 
        cur.close()
        conn.close()
    except Exception as exc:
        print("Query failed:", exc)
        


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
    query = "SELECT  B.id, B.name, B.create_date::TEXT AS c_date, B.update_date::TEXT AS u_date, COUNT(F.id) AS fitxategia_count " + from_tables + " GROUP BY B.id, B.name, B.create_date, B.update_date"

    return query_db_as_dict(query)

def create_bilduma(args):
    id = args["id"]
    title = args["title"]
    date = args["date"]
    q = f"INSERT INTO Bilduma (id, name, create_date, update_date) VALUES ({id}, '{title}', '{date}', '{date}');"
    commit_query_db(q)

def delete_bilduma(args):
    id = args["id"]
    q = f"DELETE FROM Bilduma WHERE id = {id};"
    commit_query_db(q)