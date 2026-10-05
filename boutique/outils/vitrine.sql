-- Données de vitrine pour les captures Google Play : la cliente d'essai Marie et six
-- colis réalistes, à tous les statuts. Sur la base d'ESSAI jetable seulement
-- (essai-mobile.py --serveur) : le mode « replica » coupe les déclencheurs pour poser
-- les statuts et les étapes directement, ce que la vraie base refuserait.
--   curl -X POST http://localhost:54321/essai/sql -d '{"requete": "<ce fichier>"}'
set session_replication_role = replica;
create temp table v(numero text, statut text, magasin text, descr text, poids numeric, service text, dest text, suivi text, jours int);
insert into v values
 ('GSE-1001-HT','livre','Amazon','Apple Watch SE',0.6,'aerien','Pétion-Ville','TBA3049581127',9),
 ('GSE-1002-HT','disponible','Amazon','JBL Tune 520BT',0.9,'aerien','Pétion-Ville','TBA3051877409',6),
 ('GSE-1003-HT','distribution','Walmart','Ninja Blender BL610',7.2,'aerien','Pétion-Ville','WM88214503',4),
 ('GSE-1004-HT','embarque','Nike','Nike Air Max 90',3.1,'aerien','Pétion-Ville','1Z84A7E20391',3),
 ('GSE-1005-HT','emballe','SHEIN','SHEIN — 3 articles',2.4,'aerien','Pétion-Ville','GFUS01074366533',2),
 ('GSE-1006-HT','recu','Amazon','Samsung Galaxy A55',1.4,'aerien','Pétion-Ville','TBA3058123366',1);
delete from colis_historique where colis_id in (select c.id from colis c join clients k on k.id=c.client_id where k.email='marie@exemple.com' and c.numero not in (select numero from v));
delete from colis c using clients k where k.id=c.client_id and k.email='marie@exemple.com' and c.numero not in (select numero from v);
update colis c set statut=v.statut, expediteur=v.magasin, description=v.descr, poids_lb=v.poids, service=v.service, destination=v.dest,
  suivi_transporteur=v.suivi, recu_le=now()-make_interval(days=>v.jours), maj_le=now()-make_interval(hours=>v.jours*5)
  from v where c.numero=v.numero;
delete from colis_historique h using colis c where c.id=h.colis_id and c.numero in (select numero from v);
-- Les étapes publiques jusqu'au statut de chaque colis, une par demi-journée ouvrée
insert into colis_historique(colis_id, statut, lieu, cree_le, type_evenement, statut_precedent, visibilite)
select c.id, e.statut, e.lieu,
       date_trunc('day', now()) - make_interval(days=>v.jours) + make_interval(days=>e.n, hours=>14 + e.n, mins=>e.n*7),
       e.type, e.prec, 'publique'
  from v join colis c on c.numero=v.numero
  join (values (0,'recu','COLIS_RECU','Miami (Medley), FL',null),
               (1,'emballe','COLIS_EMBALLE','Miami (Medley), FL','recu'),
               (2,'embarque','COLIS_EXPEDIE','Miami (MIA)','emballe'),
               (3,'distribution','COLIS_ARRIVE','Port-au-Prince','embarque'),
               (4,'disponible','COLIS_DISPONIBLE','Agence de Pétion-Ville','distribution'),
               (5,'livre','COLIS_LIVRE','Agence de Pétion-Ville','disponible')) e(n,statut,type,lieu,prec)
    on e.n <= array_position(array['recu','emballe','embarque','distribution','disponible','livre'], v.statut) - 1;
-- l'heure de chaque colis suit sa dernière étape
update colis c set maj_le = (select max(cree_le) from colis_historique h where h.colis_id=c.id) from v where c.numero=v.numero;
set session_replication_role = origin;
select numero, statut, description, maj_le from colis c join clients k on k.id=c.client_id where k.email='marie@exemple.com' order by maj_le desc;
