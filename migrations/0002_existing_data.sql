-- Importación verificable; no recrea ensayos ni horas de llegada históricos.
INSERT OR IGNORE INTO seasons(id,year,starts_on,ends_on,status) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad',2025,'2025-01-01','2025-12-31','closed');
INSERT OR IGNORE INTO seasons(id,year,starts_on,ends_on,status) VALUES('f740d4cc-1629-43a9-abdb-755ffc1821ae',2026,'2026-01-01','2026-12-31','active');
INSERT OR IGNORE INTO users(id,display_name,role,active,legacy_key) VALUES('8ce9f1d4-73cf-48af-a1c4-1ebee98d5156','Carlos','tenor',0,'carlos');
INSERT OR IGNORE INTO users(id,display_name,role,active,legacy_key) VALUES('d78508eb-4663-45a5-a050-7dc67990f6c0','Santiago','tenor',0,'santiago');
INSERT OR IGNORE INTO users(id,display_name,role,active,legacy_key) VALUES('5041dcc6-7de8-4eff-afa4-4df111309238','Héctor','tenor',0,'hector');
INSERT OR IGNORE INTO users(id,display_name,role,active,legacy_key) VALUES('13ab7681-f72a-4178-ade1-bb18d8fb828a','Marco','tenor',0,'marco');
INSERT OR IGNORE INTO users(id,display_name,role,active,legacy_key) VALUES('3f4af36b-fd47-4561-adef-e7f80d11fd0d','Diego','tenor',0,'diego');
INSERT OR IGNORE INTO users(id,display_name,role,active,legacy_key) VALUES('8da29f61-2f14-4b03-a9c7-e4943c11ddd1','Mario','tenor',0,'mario');
INSERT OR IGNORE INTO users(id,display_name,role,active,legacy_key) VALUES('bcb01e53-5562-4446-a90e-981b0b0ab8fc','Isaías','tenor',0,'isaias');
INSERT OR IGNORE INTO users(id,display_name,role,active,legacy_key) VALUES('fe8687af-ce98-4e33-a357-ec43d23d8065','Caleb','tenor',0,'caleb');
INSERT OR IGNORE INTO users(id,display_name,role,active,legacy_key) VALUES('4eac49ad-e145-4d82-aa5f-8f1a5eb24b33','Oswaldo','tenor',0,'oswaldo');
INSERT OR IGNORE INTO users(id,display_name,role,active,legacy_key) VALUES('194f8e00-ff9f-4443-af41-e1e34ab5c612','Leonel','tenor',0,'leonel');
INSERT OR IGNORE INTO users(id,display_name,role,active,legacy_key) VALUES('a17cb724-b4da-4d1a-a612-9f4ce5102d7b','Liam','tenor',0,'liam');
INSERT OR IGNORE INTO users(id,display_name,role,active,legacy_key) VALUES('85ecde31-5b49-4f39-abe5-9301a279953a','Rodrigo','tenor',0,'rodrigo');
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','8ce9f1d4-73cf-48af-a1c4-1ebee98d5156',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','d78508eb-4663-45a5-a050-7dc67990f6c0',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','5041dcc6-7de8-4eff-afa4-4df111309238',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','13ab7681-f72a-4178-ade1-bb18d8fb828a',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','3f4af36b-fd47-4561-adef-e7f80d11fd0d',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','8da29f61-2f14-4b03-a9c7-e4943c11ddd1',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','bcb01e53-5562-4446-a90e-981b0b0ab8fc',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','fe8687af-ce98-4e33-a357-ec43d23d8065',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','4eac49ad-e145-4d82-aa5f-8f1a5eb24b33',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('f740d4cc-1629-43a9-abdb-755ffc1821ae','3f4af36b-fd47-4561-adef-e7f80d11fd0d',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('f740d4cc-1629-43a9-abdb-755ffc1821ae','5041dcc6-7de8-4eff-afa4-4df111309238',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('f740d4cc-1629-43a9-abdb-755ffc1821ae','194f8e00-ff9f-4443-af41-e1e34ab5c612',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('f740d4cc-1629-43a9-abdb-755ffc1821ae','a17cb724-b4da-4d1a-a612-9f4ce5102d7b',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('f740d4cc-1629-43a9-abdb-755ffc1821ae','13ab7681-f72a-4178-ade1-bb18d8fb828a',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('f740d4cc-1629-43a9-abdb-755ffc1821ae','8da29f61-2f14-4b03-a9c7-e4943c11ddd1',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('f740d4cc-1629-43a9-abdb-755ffc1821ae','85ecde31-5b49-4f39-abe5-9301a279953a',1);
INSERT OR IGNORE INTO season_memberships(season_id,user_id,active) VALUES('f740d4cc-1629-43a9-abdb-755ffc1821ae','d78508eb-4663-45a5-a050-7dc67990f6c0',1);
INSERT OR IGNORE INTO legacy_attendance(season_id,user_id,minutes,scheduled_minutes,rehearsals,rehearsals_attended,attendance,tardy_count,tardy_pct,tardy_justified_pct,source) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','8ce9f1d4-73cf-48af-a1c4-1ebee98d5156',2400,2400,11,11,100,0,0,0,'app.js anterior a plataforma; agregado 2025');
INSERT OR IGNORE INTO legacy_attendance(season_id,user_id,minutes,scheduled_minutes,rehearsals,rehearsals_attended,attendance,tardy_count,tardy_pct,tardy_justified_pct,source) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','d78508eb-4663-45a5-a050-7dc67990f6c0',2400,2400,11,11,100,2,18.2,NULL,'app.js anterior a plataforma; agregado 2025');
INSERT OR IGNORE INTO legacy_attendance(season_id,user_id,minutes,scheduled_minutes,rehearsals,rehearsals_attended,attendance,tardy_count,tardy_pct,tardy_justified_pct,source) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','5041dcc6-7de8-4eff-afa4-4df111309238',2036.4,2400,11,9,84.85,3,33.3,NULL,'app.js anterior a plataforma; agregado 2025');
INSERT OR IGNORE INTO legacy_attendance(season_id,user_id,minutes,scheduled_minutes,rehearsals,rehearsals_attended,attendance,tardy_count,tardy_pct,tardy_justified_pct,source) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','13ab7681-f72a-4178-ade1-bb18d8fb828a',2115,2400,11,10,88.13,6,60,NULL,'app.js anterior a plataforma; agregado 2025');
INSERT OR IGNORE INTO legacy_attendance(season_id,user_id,minutes,scheduled_minutes,rehearsals,rehearsals_attended,attendance,tardy_count,tardy_pct,tardy_justified_pct,source) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','3f4af36b-fd47-4561-adef-e7f80d11fd0d',2098.8,2400,11,10,87.45,3,30,NULL,'app.js anterior a plataforma; agregado 2025');
INSERT OR IGNORE INTO legacy_attendance(season_id,user_id,minutes,scheduled_minutes,rehearsals,rehearsals_attended,attendance,tardy_count,tardy_pct,tardy_justified_pct,source) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','8da29f61-2f14-4b03-a9c7-e4943c11ddd1',1770,2400,11,8,73.75,3,37.5,NULL,'app.js anterior a plataforma; agregado 2025');
INSERT OR IGNORE INTO legacy_attendance(season_id,user_id,minutes,scheduled_minutes,rehearsals,rehearsals_attended,attendance,tardy_count,tardy_pct,tardy_justified_pct,source) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','bcb01e53-5562-4446-a90e-981b0b0ab8fc',1678.8,2400,11,8,69.95,2,25,NULL,'app.js anterior a plataforma; agregado 2025');
INSERT OR IGNORE INTO legacy_attendance(season_id,user_id,minutes,scheduled_minutes,rehearsals,rehearsals_attended,attendance,tardy_count,tardy_pct,tardy_justified_pct,source) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','fe8687af-ce98-4e33-a357-ec43d23d8065',1230,2400,11,6,51.25,2,33,50,'app.js anterior a plataforma; agregado 2025');
INSERT OR IGNORE INTO legacy_attendance(season_id,user_id,minutes,scheduled_minutes,rehearsals,rehearsals_attended,attendance,tardy_count,tardy_pct,tardy_justified_pct,source) VALUES('243916f0-e02c-4d41-aee2-34914bf3dfad','4eac49ad-e145-4d82-aa5f-8f1a5eb24b33',1185,2400,11,6,49.38,1,16.7,NULL,'app.js anterior a plataforma; agregado 2025');
INSERT OR IGNORE INTO songs(id,season_id,legacy_key,title,reference_audio_key,lyrics) VALUES('a249fb05-f677-4f73-a538-4ff31bcff8be','f740d4cc-1629-43a9-abdb-755ffc1821ae','fum','Fum Fum Fum','https://res.cloudinary.com/dcwx23x5o/video/upload/v1760051700/fum_fum_fum_cancion_c7zzyg.wav','Veinticinco de diciembre
Fum, fum, fum
Veinticinco de diciembre
Fum, fum, fum
Fum, fum, fum, fum, fum, fum fum
Carita de rosa
Parece una flor hermosa
Fum, fum, fum

Sopla el viento por las calles
Fum, fum, fum
Y la virgen tiene frío
Fum, fum, fum
Fum, fum, fum, fum, fum, fum fum
Quieres niño mío
En mi corazón nacer
Fum, fum, fum

Cierren todos ya sus puertas
Fum, fum, fum
Y hasta el cielo se durmió
Fum, fum, fum
Fum, fum, fum, fum, fum, fum fum
Telas de oro y plata
Yo te haré un buen colchón
Fum, fum, fum');
INSERT OR IGNORE INTO songs(id,season_id,legacy_key,title,reference_audio_key,lyrics) VALUES('e09ce921-ed4d-4e8a-afce-5b6df0794f5b','f740d4cc-1629-43a9-abdb-755ffc1821ae','adeste','Adeste Fideles','https://res.cloudinary.com/dcwx23x5o/video/upload/v1760051838/adeste_cancion_kefxux.wav','Adeste fideles, laeti triumphantes,
venite, venite in Bethlehem.
Natum videte, Regem angelorum:
venite adoremus, venite adoremus,
venite adoremus Dominum.

En grege relicto, humiles ad cunas
vocati pastores approperant;
et nos ovanti gradu festinemus:
venite adoremus, venite adoremus,
venite adoremus Dominum.

Aeterni Parentis splendorem aeternum
velatum sub carne videbimus;
Deum infantem pannis involutum:
venite adoremus, venite adoremus,
venite adoremus Dominum.');
INSERT OR IGNORE INTO songs(id,season_id,legacy_key,title,reference_audio_key,lyrics) VALUES('ac373fb5-1c22-47f3-acf5-1f025fc482f8','f740d4cc-1629-43a9-abdb-755ffc1821ae','dona','Dona Nobis Pacem','https://res.cloudinary.com/dcwx23x5o/video/upload/v1760054240/dona_nobis_pacem___cancion_hsep4p.wav','Dona nobis pacem,
dona nobis pacem,
dona nobis pacem.');
INSERT OR IGNORE INTO songs(id,season_id,legacy_key,title,reference_audio_key,lyrics) VALUES('7880e0c9-be10-477d-ad7c-992825ac8523','f740d4cc-1629-43a9-abdb-755ffc1821ae','fuentecilla','Fuentecilla que corres','https://res.cloudinary.com/dcwx23x5o/video/upload/v1760998122/fuentecilla_que_corres_cancion__qhqna2.mp3','A la nanita nana, nanita ea,
mi Jesús tiene sueño, bendito sea.
A la nanita nana, nanita ea,
mi Jesús tiene sueño, bendito sea.

Fuentecilla que corres clara y sonora,
ruiseñor que en la selva cantando lloras,
calla mientras la cuna se balancea.
A la nanita nana, nanita ea,
mi Jesús tiene sueño, bendito sea.

Manojito de rosas y alhelíes,
¿qué es lo que estás soñando que te sonríes?
¿Cuáles son tus ensueños, dime, alma mía?
Mas, ¿qué es lo que murmuras? Eucaristía.');
INSERT OR IGNORE INTO songs(id,season_id,legacy_key,title,reference_audio_key,lyrics) VALUES('35e2bc71-e14c-4a1c-ad08-a873c67e1b30','f740d4cc-1629-43a9-abdb-755ffc1821ae','campanas','Canto de las campanas','https://res.cloudinary.com/dul66qlpq/video/upload/v1760142195/canto_de_las_campanas_cancion_tq94nl.mp3','¡Qué dulce son! Campanas dan,
diciendo están: «Penas dejad».
La Navidad llega feliz;
cantos alzad, gozo tened.
Din, don, din, don.

Su canto es canto sin fin,
suenan feliz.
Llevan su voz al cielo azul,
diciendo están: «¡Gozo tened!»

Mas se oye ya su dulce son,
con claridad dice feliz:
la Navidad viene al fin;
gozo tened, pues ya llegó.

En Belén nació un bello niño,
en Belén nació un bello niño.
Su canto es canto sin fin,
llevando van a todo hogar.
Din, don, din, don.');
INSERT OR IGNORE INTO songs(id,season_id,legacy_key,title,reference_audio_key,lyrics) VALUES('4a969b38-a74b-4921-ad6f-c2816fa38a51','f740d4cc-1629-43a9-abdb-755ffc1821ae','estrella','Estrella Errante','https://res.cloudinary.com/dcwx23x5o/video/upload/v1760997189/estrella_errante_cancion_m6bcdm.mp3','He visto una estrella errante
rodandito por el cielo,
que va rápido a estrellarse
con su colita de fuego.
Quiero pensar un deseo
mientras que dura su brillo,
mas se apaga en un instante,
¿quién sabe dónde se ha ido?

La, la, la, la, ¿dónde se ha ido?
La, la, la, ya se ha dormido.

He visto una estrella errante
rodandito por el cielo;
unos magos la han seguido
a un establo y ya se han ido.
Allí dentro estaba un niño,
dormidito en un pesebre;
San José era su padre
y María era su madre.

La, la, la, la, ¿dónde se ha ido?
La, la, la, ya se ha dormido.');
INSERT OR IGNORE INTO songs(id,season_id,legacy_key,title,reference_audio_key,lyrics) VALUES('c2e6747a-37e7-4281-a56f-f4a867357438','f740d4cc-1629-43a9-abdb-755ffc1821ae','paz','Himno a la paz','https://res.cloudinary.com/dcwx23x5o/video/upload/v1760997237/himno_a_la_paz_cancion_avurel.mp3','Paz, paz, paz,
el mundo pide paz.
Logra la paz en tu interior
y derrámala en la tierra.

Paz, paz, paz,
el mundo pide paz.
Logra la paz en tu interior
y derrámala en la tierra.');
INSERT OR IGNORE INTO songs(id,season_id,legacy_key,title,reference_audio_key,lyrics) VALUES('3c0927e9-7fd4-4bdc-a69e-99384932b951','f740d4cc-1629-43a9-abdb-755ffc1821ae','merry','We wish you a merry christmas','https://res.cloudinary.com/dcwx23x5o/video/upload/v1760997255/we_wish_you_cancion_pgz1i2.mp3','We wish you a merry Christmas,
we wish you a merry Christmas,
we wish you a merry Christmas
and a happy New Year.

Good tidings we bring
to you and your kin.
Good tidings for Christmas
and a happy New Year.

We wish you a merry Christmas,
we wish you a merry Christmas,
we wish you a merry Christmas
and a happy New Year.');
INSERT OR IGNORE INTO songs(id,season_id,legacy_key,title,reference_audio_key,lyrics) VALUES('2ba2de2e-7879-4bfe-a905-d24b9ca8adf3','f740d4cc-1629-43a9-abdb-755ffc1821ae','kling','Kling Glöckchen, klingelingeling','https://res.cloudinary.com/dul66qlpq/video/upload/v1761827592/kling_cancion_xawypb.mp3','Kling, Glöckchen, klingelingeling!
Kling, Glöckchen, kling!
Lasst mich ein, ihr Kinder,
ist so kalt der Winter!
Öffnet mir die Türen,
lasst mich nicht erfrieren!
Kling, Glöckchen, klingelingeling!
Kling, Glöckchen, kling!

Kling, Glöckchen, klingelingeling!
Kling, Glöckchen, kling!
Mädchen, hört, und Bübchen,
macht mir auf das Stübchen!
Bring euch viele Gaben,
sollt euch dran erlaben!
Kling, Glöckchen, klingelingeling!
Kling, Glöckchen, kling!

Kling, Glöckchen, klingelingeling!
Kling, Glöckchen, kling!
Hell erglühn die Kerzen,
öffnet mir die Herzen!
Will drin wohnen fröhlich,
frommes Kind, wie selig!
Kling, Glöckchen, klingelingeling!
Kling, Glöckchen, kling!');
INSERT OR IGNORE INTO songs(id,season_id,legacy_key,title,reference_audio_key,lyrics) VALUES('9db66d52-1889-4c20-a900-92a68ffcefb6','f740d4cc-1629-43a9-abdb-755ffc1821ae','tannenbaum','O Tannenbaum','https://res.cloudinary.com/dcwx23x5o/video/upload/v1761968289/oh_thanenbaum_kkhmya.mp3','O Tannenbaum, o Tannenbaum,
wie treu sind deine Blätter!
O Tannenbaum, o Tannenbaum,
wie treu sind deine Blätter!
Du grünst nicht nur zur Sommerzeit,
nein, auch im Winter, wenn es schneit.
O Tannenbaum, o Tannenbaum,
wie treu sind deine Blätter!

O Tannenbaum, o Tannenbaum,
du kannst mir sehr gefallen!
O Tannenbaum, o Tannenbaum,
du kannst mir sehr gefallen!
Wie oft hat nicht zur Weihnachtszeit
ein Baum von dir mich hoch erfreut!
O Tannenbaum, o Tannenbaum,
du kannst mir sehr gefallen!');
INSERT OR IGNORE INTO songs(id,season_id,legacy_key,title,reference_audio_key,lyrics) VALUES('11260e51-11b4-42c4-a718-52cc72d0d012','f740d4cc-1629-43a9-abdb-755ffc1821ae','mundo','Mundo feliz','https://res.cloudinary.com/dul66qlpq/video/upload/v1764903368/mundo-feliz_udqafi.wav','Mundo feliz, Jesús nació,
ya nuestro Rey está.
Y todo lo que Dios creó,
a su encuentro va,
a su encuentro va.
Feliz, feliz, a su encuentro va.

Joy to the world, the Lord has come!
Let earth receive her King;
let every heart prepare Him room,
and heaven and nature sing,
and heaven and nature sing,
and heaven, and heaven, and nature sing.');
INSERT OR IGNORE INTO songs(id,season_id,legacy_key,title,reference_audio_key,lyrics) VALUES('43f0d52b-fdba-4738-a69a-343268ff1e64','f740d4cc-1629-43a9-abdb-755ffc1821ae','stelle','Tu scendi dalle stelle','https://res.cloudinary.com/dul66qlpq/video/upload/v1764903364/tu-scendi_xbmuo7.wav','O Bambino mio divino,
io ti vedo qui a tremar;
o Dio beato!
Ah, quanto ti costò
l''avermi amato!');
