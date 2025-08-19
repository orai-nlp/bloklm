#activate_this = 'venv/bin/activate_this.py'
#with open(activate_this) as f:
#    exec(f.read(), dict(__file__=activate_this))

import sys
sys.path.insert(0, "/backend")

from blok_app import app as application