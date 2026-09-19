-- Continente de los emisores visibles -----------------------------------------
--
-- SE EJECUTA DESPUÉS de emisores-visibles.sql y emisores-duplicados.sql.
--
-- Asigna `coins_regions.continent` sólo a los emisores visibles en el
-- selector, cruzando por nombre contra la misma lista de países de
-- emisores-visibles.sql (con el paréntesis de años recortado igual que allí).
--
-- Los valores son: América, Europa, Asia, África, Oceanía. Los países
-- transcontinentales van donde los agrupa la lista: Rusia en Europa, Turquía
-- y el Cáucaso en Asia, Egipto en África, Chipre en Europa.
--
-- Se puede volver a ejecutar: sólo sobrescribe el continente de los emisores
-- visibles que están en la lista. Para deshacerlo:
--
--   update coins_regions set continent = null;

create temporary view continentes as
select * from (values
  -- América
  ('Antigua y Barbuda', 'América'), ('Argentina', 'América'),
  ('Bahamas', 'América'), ('Barbados', 'América'), ('Belice', 'América'),
  ('Bermudas', 'América'), ('Islas Caimán', 'América'),
  ('Caimán, Islas', 'América'),
  ('Bolivia', 'América'), ('Brasil', 'América'), ('Canadá', 'América'),
  ('Chile', 'América'), ('Colombia', 'América'), ('Costa Rica', 'América'),
  ('Cuba', 'América'), ('Dominica', 'América'), ('Ecuador', 'América'),
  ('El Salvador', 'América'), ('Estados Unidos', 'América'),
  ('Estados Unidos de América', 'América'), ('Granada', 'América'),
  ('Guatemala', 'América'), ('Guyana', 'América'), ('Haití', 'América'),
  ('Honduras', 'América'), ('Jamaica', 'América'), ('México', 'América'),
  ('Nicaragua', 'América'), ('Panamá', 'América'), ('Paraguay', 'América'),
  ('Perú', 'América'), ('República Dominicana', 'América'),
  ('Dominicana, República', 'América'),
  ('San Cristóbal y Nieves', 'América'),
  ('San Vicente y las Granadinas', 'América'), ('Santa Lucía', 'América'),
  ('Surinam', 'América'), ('Trinidad y Tobago', 'América'),
  ('Uruguay', 'América'), ('Venezuela', 'América'),
  -- Europa
  ('Albania', 'Europa'), ('Alemania', 'Europa'), ('Andorra', 'Europa'),
  ('Austria', 'Europa'), ('Bélgica', 'Europa'), ('Bielorrusia', 'Europa'),
  ('Bosnia y Herzegovina', 'Europa'), ('Bulgaria', 'Europa'),
  ('Chipre', 'Europa'), ('Croacia', 'Europa'), ('Dinamarca', 'Europa'),
  ('Eslovaquia', 'Europa'), ('Eslovenia', 'Europa'), ('España', 'Europa'),
  ('Estonia', 'Europa'), ('Finlandia', 'Europa'), ('Francia', 'Europa'),
  ('Grecia', 'Europa'), ('Hungría', 'Europa'), ('Irlanda', 'Europa'),
  ('Islandia', 'Europa'), ('Italia', 'Europa'), ('Kosovo', 'Europa'),
  ('Letonia', 'Europa'), ('Liechtenstein', 'Europa'), ('Lituania', 'Europa'),
  ('Luxemburgo', 'Europa'), ('Macedonia del Norte', 'Europa'),
  ('Malta', 'Europa'), ('Moldavia', 'Europa'), ('Mónaco', 'Europa'),
  ('Montenegro', 'Europa'), ('Noruega', 'Europa'),
  ('Países Bajos', 'Europa'), ('Polonia', 'Europa'), ('Portugal', 'Europa'),
  ('Reino Unido', 'Europa'), ('República Checa', 'Europa'),
  ('Checa, República', 'Europa'), ('Rumania', 'Europa'),
  ('Rumanía', 'Europa'), ('Rusia', 'Europa'), ('San Marino', 'Europa'),
  ('Serbia', 'Europa'), ('Suecia', 'Europa'), ('Suiza', 'Europa'),
  ('Ucrania', 'Europa'), ('Ciudad del Vaticano', 'Europa'),
  ('Vaticano, Ciudad del', 'Europa'),
  -- Asia
  ('Afganistán', 'Asia'), ('Arabia Saudita', 'Asia'),
  ('Arabia Saudí', 'Asia'), ('Armenia', 'Asia'), ('Azerbaiyán', 'Asia'),
  ('Bangladés', 'Asia'), ('Baréin', 'Asia'), ('Birmania', 'Asia'),
  ('Brunéi', 'Asia'), ('Bután', 'Asia'), ('Camboya', 'Asia'),
  ('Catar', 'Asia'), ('China', 'Asia'), ('Corea del Norte', 'Asia'),
  ('Corea del Sur', 'Asia'), ('Emiratos Árabes Unidos', 'Asia'),
  ('Filipinas', 'Asia'), ('Georgia', 'Asia'), ('India', 'Asia'),
  ('Indonesia', 'Asia'), ('Irak', 'Asia'), ('Irán', 'Asia'),
  ('Israel', 'Asia'), ('Japón', 'Asia'), ('Jordania', 'Asia'),
  ('Kazajistán', 'Asia'), ('Kirguistán', 'Asia'), ('Kuwait', 'Asia'),
  ('Laos', 'Asia'), ('Líbano', 'Asia'), ('Malasia', 'Asia'),
  ('Maldivas', 'Asia'), ('Mongolia', 'Asia'), ('Myanmar', 'Asia'),
  ('Nepal', 'Asia'), ('Omán', 'Asia'), ('Pakistán', 'Asia'),
  ('Palestina', 'Asia'), ('Singapur', 'Asia'), ('Siria', 'Asia'),
  ('Sri Lanka', 'Asia'), ('Tailandia', 'Asia'), ('Tayikistán', 'Asia'),
  ('Timor Oriental', 'Asia'), ('Turkmenistán', 'Asia'), ('Turquía', 'Asia'),
  ('Uzbekistán', 'Asia'), ('Vietnam', 'Asia'), ('Yemen', 'Asia'),
  -- África
  ('Angola', 'África'), ('Argelia', 'África'), ('Benín', 'África'),
  ('Botsuana', 'África'), ('Burkina Faso', 'África'), ('Burundi', 'África'),
  ('Cabo Verde', 'África'), ('Camerún', 'África'), ('Chad', 'África'),
  ('Comoras', 'África'), ('Congo', 'África'),
  ('República Democrática del Congo', 'África'),
  ('Congo, República Democrática del', 'África'),
  ('Costa de Marfil', 'África'), ('Egipto', 'África'), ('Eritrea', 'África'),
  ('Esuatini', 'África'), ('Suazilandia', 'África'), ('Etiopía', 'África'),
  ('Gabón', 'África'), ('Gambia', 'África'), ('Ghana', 'África'),
  ('Guinea', 'África'), ('Guinea Ecuatorial', 'África'),
  ('Guinea-Bisáu', 'África'), ('Kenia', 'África'), ('Lesoto', 'África'),
  ('Liberia', 'África'), ('Libia', 'África'), ('Madagascar', 'África'),
  ('Malaui', 'África'), ('Mali', 'África'), ('Malí', 'África'),
  ('Marruecos', 'África'), ('Mauricio', 'África'), ('Mauritania', 'África'),
  ('Mozambique', 'África'), ('Namibia', 'África'), ('Níger', 'África'),
  ('Nigeria', 'África'), ('República Centroafricana', 'África'),
  ('Centroafricana, República', 'África'), ('Ruanda', 'África'),
  ('Santo Tomé y Príncipe', 'África'), ('Senegal', 'África'),
  ('Seychelles', 'África'), ('Sierra Leona', 'África'),
  ('Somalia', 'África'), ('Sudáfrica', 'África'), ('Sudán', 'África'),
  ('Sudán del Sur', 'África'), ('Tanzania', 'África'), ('Togo', 'África'),
  ('Túnez', 'África'), ('Uganda', 'África'), ('Yibuti', 'África'),
  ('Zambia', 'África'), ('Zimbabue', 'África'),
  -- Oceanía
  ('Australia', 'Oceanía'), ('Fiyi', 'Oceanía'),
  ('Islas Marshall', 'Oceanía'), ('Marshall, Islas', 'Oceanía'),
  ('Islas Salomón', 'Oceanía'), ('Salomón, Islas', 'Oceanía'),
  ('Kiribati', 'Oceanía'), ('Estados Federados de Micronesia', 'Oceanía'),
  ('Micronesia, Estados Federados de', 'Oceanía'), ('Nauru', 'Oceanía'),
  ('Nueva Zelanda', 'Oceanía'), ('Palaos', 'Oceanía'),
  ('Papúa Nueva Guinea', 'Oceanía'), ('Samoa', 'Oceanía'),
  ('Tonga', 'Oceanía'), ('Tuvalu', 'Oceanía'), ('Vanuatu', 'Oceanía')
) as t(nombre, continente);


-- 1. El cambio.
update coins_regions r
set continent = c.continente
from continentes c
where r.visible_in_selector
  and lower(trim(regexp_replace(r.issuer_name, '\s*\([^)]*\)\s*$', ''))) = lower(c.nombre);


-- 2. Visibles que quedaron SIN continente: los que activaste a mano y no están
--    en la lista. Debe devolver 0 filas; si no, asígnalos así:
--
--      update coins_regions set continent = 'América' where issuer_code = '...';
select issuer_code, issuer_name
from coins_regions
where visible_in_selector and continent is null
order by issuer_name;


-- 3. Cómo quedó.
select continent, count(*) as emisores
from coins_regions
where visible_in_selector
group by continent
order by continent nulls last;
