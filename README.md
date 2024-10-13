# geocoding-service
EN:

((Geocoding server))

This server has 2 APIs that are responsible for:
1-geocoding by leaving addresses as input and getting the longitude and latitude as output.
2-reverse geocoding by leaving longitude and latitude and getting address as output.

In geocoding API there are 3 queries: Street , number, city, and in ReverseGeocoding there are two: longitude latitude

-https://segnalazione-330111.ew.r.appspot.com/geocode/?street=via del corso?number=12?city=roma
-https://segnalazione-330111.ew.r.appspot.com/reverse?longitude=12.4278&latitude=41.8813


When the user calls Geocoding API after checking a street dictionary, number dictionary, city dictionary, it gets the best of them and looks for the address in the database which is the Indrizzi.csv file at the moment. this is also true when the user calls the reverse geocoding API however by searching in different dictionaries in code. the format of the output would be the same in 2 mentioned cases as follows:

{street:"", city:"", number:"", longitude:"", latitude:"}

if the address is not found in DB it automatically calls an external provider to get the exact response either address or coordinates, then the response is reformated as DB can read it and it will be saved in DB so next time it can get the response without calling the external provider but in order to that , the server needs to be restarted frequently.


IT:

Server di geocodifica

Questo server ha 2 API responsabili di:
1-geocodifica lasciando gli indirizzi come input e ottenendo la longitudine e la latitudine come output.
Geocodifica inversa 2 lasciando longitudine e latitudine e ottenendo l'indirizzo come output.

Nell'API di geocodifica ci sono 3 query: via, numero, città e in ReverseGeocoding ce ne sono due: longitudine latitudine

-https://segnalazione-330111.ew.r.appspot.com/geocode/?street=via del corso?number=12?city=roma
-https://segnalazione-330111.ew.r.appspot.com/reverse?longitude=12.4278&latitude=41.8813


Quando l'utente chiama Geocoding API dopo aver controllato un dizionario stradale, un dizionario dei numeri, un dizionario delle città, ne ottiene il meglio e cerca l'indirizzo nel database che al momento è il file Indrizzi.csv. questo vale anche quando l'utente chiama l'API di geocodifica inversa, tuttavia, effettuando una ricerca in diversi dizionari nel codice. il formato dell'output sarebbe lo stesso in 2 casi menzionati come segue:

{street:"", city:"", number:"", longitude:"", latitude:"}

se l'indirizzo non viene trovato nel DB, chiama automaticamente un provider esterno per ottenere la risposta esatta o l'indirizzo o le coordinate, quindi la risposta viene riformattata poiché DB può leggerla e verrà salvata in DB, quindi la prossima volta può ottenere la risposta senza chiamando il provider esterno, ma per farlo il server deve essere riavviato frequentemente.