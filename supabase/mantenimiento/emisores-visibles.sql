-- Emisores visibles en el selector de país ----------------------------------
--
-- `coins_regions` tiene ~10.000 emisores, casi todos entidades históricas:
-- ciudades, cecas y estados desaparecidos. El selector sólo debería ofrecer
-- países actuales.
--
-- El cruce es por nombre contra la lista de abajo. Dos detalles de cómo nombra
-- Numista, que la comparación tiene en cuenta:
--
--   * Añade el rango de años: "Belice (1973-presente)". Se recorta el
--     paréntesis final antes de comparar.
--   * Invierte algunos nombres: "Marshall, Islas", "Dominicana, República".
--     Para esos, la lista incluye las dos formas.
--
-- Un nombre de la lista que no exista en Numista no coincide y no hace daño.
-- Lo que importa es lo contrario: un país que falte en la lista queda oculto.
-- Por eso el guion imprime primero los que no encontraron emisor.
--
-- Se puede volver a ejecutar tantas veces como haga falta: reconstruye la
-- visibilidad desde cero cada vez. Para deshacerlo todo:
--
--   update coins_regions set visible_in_selector = true;

-- La lista de países, en un solo lugar.
create temporary view paises_actuales as
select * from (values
  -- América
  ('Antigua y Barbuda'), ('Argentina'), ('Bahamas'), ('Barbados'), ('Belice'),
  ('Bermudas'), ('Islas Caimán'), ('Caimán, Islas'),
  ('Bolivia'), ('Brasil'), ('Canadá'), ('Chile'), ('Colombia'), ('Costa Rica'),
  ('Cuba'), ('Dominica'), ('Ecuador'), ('El Salvador'), ('Estados Unidos'),
  ('Estados Unidos de América'), ('Granada'), ('Guatemala'), ('Guyana'),
  ('Haití'), ('Honduras'), ('Jamaica'), ('México'), ('Nicaragua'), ('Panamá'),
  ('Paraguay'), ('Perú'), ('República Dominicana'), ('Dominicana, República'),
  ('San Cristóbal y Nieves'), ('San Vicente y las Granadinas'),
  ('Santa Lucía'), ('Surinam'), ('Trinidad y Tobago'), ('Uruguay'),
  ('Venezuela'),
  -- Europa
  ('Albania'), ('Alemania'), ('Andorra'), ('Austria'), ('Bélgica'),
  ('Bielorrusia'), ('Bosnia y Herzegovina'), ('Bulgaria'), ('Chipre'),
  ('Croacia'), ('Dinamarca'), ('Eslovaquia'), ('Eslovenia'), ('España'),
  ('Estonia'), ('Finlandia'), ('Francia'), ('Grecia'), ('Hungría'),
  ('Irlanda'), ('Islandia'), ('Italia'), ('Kosovo'), ('Letonia'),
  ('Liechtenstein'), ('Lituania'), ('Luxemburgo'), ('Macedonia del Norte'),
  ('Malta'), ('Moldavia'), ('Mónaco'), ('Montenegro'), ('Noruega'),
  ('Países Bajos'), ('Polonia'), ('Portugal'), ('Reino Unido'),
  ('República Checa'), ('Checa, República'), ('Rumania'), ('Rumanía'),
  ('Rusia'), ('San Marino'), ('Serbia'), ('Suecia'), ('Suiza'), ('Ucrania'),
  ('Ciudad del Vaticano'), ('Vaticano, Ciudad del'),
  -- Asia
  ('Afganistán'), ('Arabia Saudita'), ('Arabia Saudí'), ('Armenia'),
  ('Azerbaiyán'), ('Bangladés'), ('Baréin'), ('Birmania'), ('Brunéi'),
  ('Bután'), ('Camboya'), ('Catar'), ('China'), ('Corea del Norte'),
  ('Corea del Sur'), ('Emiratos Árabes Unidos'), ('Filipinas'), ('Georgia'),
  ('India'), ('Indonesia'), ('Irak'), ('Irán'), ('Israel'), ('Japón'),
  ('Jordania'), ('Kazajistán'), ('Kirguistán'), ('Kuwait'), ('Laos'),
  ('Líbano'), ('Malasia'), ('Maldivas'), ('Mongolia'), ('Myanmar'), ('Nepal'),
  ('Omán'), ('Pakistán'), ('Palestina'), ('Singapur'), ('Siria'),
  ('Sri Lanka'), ('Tailandia'), ('Tayikistán'), ('Timor Oriental'),
  ('Turkmenistán'), ('Turquía'), ('Uzbekistán'), ('Vietnam'), ('Yemen'),
  -- África
  ('Angola'), ('Argelia'), ('Benín'), ('Botsuana'), ('Burkina Faso'),
  ('Burundi'), ('Cabo Verde'), ('Camerún'), ('Chad'), ('Comoras'), ('Congo'),
  ('República Democrática del Congo'), ('Congo, República Democrática del'),
  ('Costa de Marfil'), ('Egipto'), ('Eritrea'), ('Esuatini'), ('Suazilandia'),
  ('Etiopía'), ('Gabón'), ('Gambia'), ('Ghana'), ('Guinea'),
  ('Guinea Ecuatorial'), ('Guinea-Bisáu'), ('Kenia'), ('Lesoto'), ('Liberia'),
  ('Libia'), ('Madagascar'), ('Malaui'), ('Mali'), ('Malí'), ('Marruecos'),
  ('Mauricio'), ('Mauritania'), ('Mozambique'), ('Namibia'), ('Níger'),
  ('Nigeria'), ('República Centroafricana'), ('Centroafricana, República'),
  ('Ruanda'), ('Santo Tomé y Príncipe'), ('Senegal'), ('Seychelles'),
  ('Sierra Leona'), ('Somalia'), ('Sudáfrica'), ('Sudán'), ('Sudán del Sur'),
  ('Tanzania'), ('Togo'), ('Túnez'), ('Uganda'), ('Yibuti'), ('Zambia'),
  ('Zimbabue'),
  -- Oceanía
  ('Australia'), ('Fiyi'), ('Islas Marshall'), ('Marshall, Islas'),
  ('Islas Salomón'), ('Salomón, Islas'), ('Kiribati'),
  ('Estados Federados de Micronesia'), ('Micronesia, Estados Federados de'),
  ('Nauru'), ('Nueva Zelanda'), ('Palaos'), ('Papúa Nueva Guinea'), ('Samoa'),
  ('Tonga'), ('Tuvalu'), ('Vanuatu')
) as t(nombre);

-- El nombre de cada emisor sin el rango de años final, para comparar.
create temporary view emisores_normalizados as
select issuer_code,
       issuer_name,
       lower(trim(regexp_replace(issuer_name, '\s*\([^)]*\)\s*$', ''))) as nombre
from coins_regions;


-- 1. Países de la lista que NO encontraron emisor en Numista.
--    Si aparece alguno que coleccionas, busca su nombre exacto y añádelo.
select p.nombre as pais_sin_emisor
from paises_actuales p
left join emisores_normalizados e on e.nombre = lower(p.nombre)
where e.issuer_code is null
order by 1;


-- 2. Los emisores que quedarán visibles.
select e.issuer_code, e.issuer_name
from emisores_normalizados e
where e.nombre in (select lower(nombre) from paises_actuales)
order by e.issuer_name;


-- 3. El cambio.
update coins_regions set visible_in_selector = false;

update coins_regions set visible_in_selector = true
where issuer_code in (
  select e.issuer_code
  from emisores_normalizados e
  where e.nombre in (select lower(nombre) from paises_actuales)
);

-- 4. Cómo quedó.
select count(*) filter (where visible_in_selector) as visibles,
       count(*)                                    as total
from coins_regions;


-- Duplicados: dos códigos con el mismo nombre -------------------------------
--
-- Numista tiene, para muchos países, un emisor y además un contenedor que lo
-- agrupa con sus entidades históricas. Los dos se llaman igual:
--
--   chili    = Catálogo › Chile › Chile   (652 objetos)  <- el emisor
--   chile_section = Catálogo › Chile      (691 objetos)  <- el contenedor
--   espagne  = Catálogo › España › España (4.339)        <- el emisor
--   spain    = Catálogo › España          (12.841)       <- el contenedor
--
-- El que llevan las monedas es el emisor, el de la ruta más profunda: es el
-- `issuer.code` que devuelve la API y el que queda guardado en coins_types.
-- El contenedor no siempre termina en `_section` (spain, denmark no lo hacen),
-- así que no se puede distinguir por el código.
--
-- Cuidado al ocultarlos en bloque: hay países cuya única entrada ES el
-- contenedor (Nueva Zelanda sólo existe como `new_zealand_section`). Ocultar
-- todos los `_section` la haría desaparecer.

-- 5. Nombres visibles que tienen más de un código. Resuélvelos a mano.
select lower(trim(regexp_replace(issuer_name, '\s*\([^)]*\)\s*$', ''))) as nombre,
       count(*)                       as codigos,
       string_agg(issuer_code, ', ' order by issuer_code) as cuales
from coins_regions
where visible_in_selector
group by 1
having count(*) > 1
order by 1;

-- 6. Para decidir cada par sin salir de la base: estos son los códigos que la
--    API ya usó para las monedas que tienes. Ese es el emisor correcto.
select distinct t.issuer_code, t.issuer_name
from coins_types t
order by t.issuer_name;

-- 7. Una vez decidido, se ocultan los sobrantes uno por uno:
--
--   update coins_regions set visible_in_selector = false
--   where issuer_code in ('chile_section', 'spain', 'denmark');
