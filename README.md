## BACKEND

### SETUP
Backend-a lehen aldiz erabiltzen hasteko sortu dut `backend/db_utils/setup.sh`, bertan instalatu eta sortzen dira behar diren programa/pakete/environment-ak:
* Instalatu PostgreSQL
* Sortu virtual enviroment-a eta dependentziak instalatu
* Sortu databasea eta erabiltzailea
* Sortu taula hutsak databasearen barruan

## FRONTEND
### SETUP
Frontend-a lehen aldiz erabiltzen hasteko sortu dut `setup-angular.sh`, bertan instalatu eta sortzen dira behar diren programa/pakete/proiektu-ak:

| Funtzioa                   | Azalpena                                                                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **check\_nodejs**          | Node.js instalatuta dagoen egiaztatzen du; bertsioa 16 baino txikiagoa bada, eguneratzeko aukera eskaintzen du.                                                                          |
| **check\_npm**             | npm (Node Package Manager) instalatuta dagoen egiaztatzen du; beharrezkoa bada, berez instalatzen saiatzen da.                                                                           |
| **install\_angular\_cli**  | Angular CLI tresna globalki instalatzen du (`ng` komandoa eskuragarri egoteko).                                                                                                          |
| **get\_project\_name**     | Erabiltzaileari proiektu-izena eskatzen dio, eta alfabetikoa den baliozkotzea egiten du.                                                                                                     |
| **get\_user\_preferences** | Erabiltzaileari routing-a gehitu nahi duen galdetzen dio eta estilo-formatua aukeratzeko eskaintzen dio (CSS, SCSS, Sass edo Less).                                                      |
| **create\_project**        | `ng new` komandoa exekutatzen du aurreko aukerekin eta proiektua sortzen du.                                                                                                             |
| **offer\_to\_source\_nvm** | Erabiltzaileari galdetzen dio NVM script-a automatikoki kargatu nahi duen edozein terminal berrian; baietz esanez gero, `.bashrc`, `.zshrc` edo `.profile` fitxategian gehitu egiten du. |
| **install\_dependencies**  | Behar diren NPM paketeak instalatzeko funtzioa. |
| **show\_next\_steps**      | Proiektua sortu ondoren, hurrengo urratsak erakusten ditu (`cd`, `ng serve`, ohiko komandoak) eta zerbitzaria abiarazteko aukera ematen du.                                              |

