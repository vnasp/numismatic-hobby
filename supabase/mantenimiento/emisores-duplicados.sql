-- Duplicados del selector: un país, dos códigos -----------------------------
--
-- SE EJECUTA DESPUÉS de emisores-visibles.sql. Ese guion enciende los dos
-- códigos de cada par (ambos se llaman igual), y este apaga el que sobra. Al
-- revés no sirve: el otro los volvería a encender.
--
-- Para casi todos los países, Numista tiene dos entradas con el mismo nombre:
--
--   united-states  Catálogo › Estados Unidos                  33.926 objetos
--   etats-unis     Catálogo › Estados Unidos › Estados Unidos 32.786 objetos
--
-- La primera es un contenedor que agrega al país con sus entidades históricas;
-- la segunda es el emisor, y es la que llevan las monedas. Se ve en la
-- aritmética: en Chile, `chili` (652) + `chile_states` (39) = `chile_section`
-- (691) exacto, o sea que el contenedor no tiene tipos propios. Si la API no
-- filtrara de forma jerárquica, elegir el contenedor devolvería cero
-- resultados, así que se conserva siempre el emisor.
--
-- Regla práctica: el código en francés es el emisor (`espagne`, `danemark`,
-- `chili`, `etats-unis`, `argentine`) y el inglés es el contenedor. Los
-- sufijos `_section`, `_period`, `_ancient` y `-antique` son, respectivamente,
-- contenedores, subperiodos y entidades antiguas.
--
-- Once casos no seguían la regla y se resolvieron mirando su ficha en Numista.
-- El más raro es Alemania: ahí se conserva el contenedor `germany`, porque el
-- emisor de segundo nivel (`allemagne-pre1945`) sólo cubre 1871-1948.
--
-- Comprobación posterior, al final del archivo: ningún nombre debe quedar con
-- más de un código visible.

update coins_regions set visible_in_selector = false
where issuer_code in (
  'afghanistan_section',               -- afganistán → se conserva afghanistan
  'albania_section',                   -- albania → se conserva albanie
  'algeria_section',                   -- argelia → se conserva algerie
  'allemagne-pre1945',                 -- alemania → se conserva germany
  'antigua_et_barbuda_section',        -- antigua y barbuda → se conserva antigua-et-barbuda
  'argentina',                         -- argentina → se conserva argentine
  'armenia_province',                  -- armenia → se conserva armenie
  'australia_section',                 -- australia → se conserva australie
  'austria',                           -- austria → se conserva autriche
  'azerbaijan',                        -- azerbaiyán → se conserva azerbaidjan
  'belgium',                           -- bélgica → se conserva belgique
  'belize_section',                    -- belice → se conserva belize
  'benin_section',                     -- benín → se conserva benin
  'boer',                              -- sudáfrica → se conserva afrique_du_sud
  'bosnia_herzegovina_section',        -- bosnia y herzegovina → se conserva bosnie-herzegovine
  'brazil_section',                    -- brasil → se conserva bresil
  'bulgaria_section',                  -- bulgaria → se conserva bulgarie
  'cambodia_section',                  -- camboya → se conserva cambodge
  'cameroon_section',                  -- camerún → se conserva cameroun
  'canada_section',                    -- canadá → se conserva canada
  'chile_section',                     -- chile → se conserva chili
  'chypre_section',                    -- chipre → se conserva chypre
  'colombia_section',                  -- colombia → se conserva colombie
  'croatia',                           -- croacia → se conserva croatie
  'cyprus_ancient_section',            -- chipre → se conserva chypre
  'cyprus_province',                   -- chipre → se conserva chypre
  'czech',                             -- república checa → se conserva republique_tcheque
  'denmark',                           -- dinamarca → se conserva danemark
  'djibouti_period',                   -- yibuti → se conserva djibouti
  'djibouti_section',                  -- yibuti → se conserva djibouti
  'dominican-republic',                -- dominicana, república → se conserva republique_dominicaine
  'drc',                               -- congo, república democrática del → se conserva republique_democratique_du_congo
  'egypt-ancient',                     -- egipto → se conserva egypte
  'egypt_ancient_section',             -- egipto → se conserva egypte
  'egypt_province',                    -- egipto → se conserva egypte
  'eritrea_section',                   -- eritrea → se conserva erythree
  'estonia_section',                   -- estonia → se conserva estonie
  'ethiopia_section',                  -- etiopía → se conserva ethiopie
  'france_section',                    -- francia → se conserva france
  'georgia_section',                   -- georgia → se conserva georgie
  'ghana_section',                     -- ghana → se conserva ghana
  'greece',                            -- grecia → se conserva grece
  'guatemala_section',                 -- guatemala → se conserva guatemala
  'guinea-bissau',                     -- guinea-bisáu → se conserva guinee_bissau
  'guyana_section',                    -- guyana → se conserva guyana
  'haiti_section',                     -- haití → se conserva haiti
  'hungary',                           -- hungría → se conserva hongrie
  'india',                             -- india → se conserva inde
  'india-ancient',                     -- india → se conserva inde
  'indonesia',                         -- indonesia → se conserva indonesie
  'indonesia_section',                 -- indonesia → se conserva indonesie
  'iran_section',                      -- irán → se conserva iran
  'iraq',                              -- irak → se conserva irak
  'israel_section',                    -- israel → se conserva israel
  'italy',                             -- italia → se conserva italie
  'italy_ancient',                     -- italia → se conserva italie
  'japan_section',                     -- japón → se conserva japon
  'kenya_section',                     -- kenia → se conserva kenya
  'laos_greek',                        -- laos → se conserva laos
  'laos_section',                      -- laos → se conserva laos
  'lettonie_section',                  -- letonia → se conserva lettonie
  'libya_section',                     -- libia → se conserva libye
  'lithuania_section',                 -- lituania → se conserva lituanie
  'luxembourg_section',                -- luxemburgo → se conserva luxembourg
  'madagascar_section',                -- madagascar → se conserva madagascar
  'malaysia',                          -- malasia → se conserva malaisie
  'mali',                              -- malí → se conserva mali_period
  'mauretanie-antique',                -- mauritania → se conserva mauritanie
  'mexico',                            -- méxico → se conserva mexique
  'monaco_section',                    -- mónaco → se conserva monaco
  'montenegro_section',                -- montenegro → se conserva montenegro
  'morocco_section',                   -- marruecos → se conserva maroc
  'myanmar_section',                   -- myanmar → se conserva myanmar
  'namibia_period',                    -- namibia → se conserva namibie
  'nepal_medieval',                    -- nepal → se conserva nepal
  'nepal_section',                     -- nepal → se conserva nepal
  'netherlands',                       -- países bajos → se conserva pays-bas
  'new_zealand_section',               -- nueva zelanda → se conserva nouvelle-zelande
  'nicaragua_section',                 -- nicaragua → se conserva nicaragua
  'nigeria_section',                   -- nigeria → se conserva nigeria
  'north_macedonia_section',           -- macedonia del norte → se conserva macedoine
  'norway',                            -- noruega → se conserva norvege
  'oman_section',                      -- omán → se conserva oman
  'papal_states_section',              -- vaticano, ciudad del → se conserva vatican
  'papua-new-guinea',                  -- papúa nueva guinea → se conserva papouasie-nouvelle-guinee
  'paraguay_section',                  -- paraguay → se conserva paraguay
  'perou_section',                     -- perú → se conserva perou
  'philippines_section',               -- filipinas → se conserva philippines
  'poland_section',                    -- polonia → se conserva pologne
  'portugal_section',                  -- portugal → se conserva portugal
  'romania_section',                   -- rumania → se conserva roumanie
  'saint-kitts-and-nevis_section',     -- san cristóbal y nieves → se conserva st-kitts-and-neviss
  'saudi-arabia',                      -- arabia saudita → se conserva arabie_saoudite
  'saudi-arabia-period',               -- arabia saudita → se conserva arabie_saoudite
  'senegal_section',                   -- senegal → se conserva senegal
  'serbia_section',                    -- serbia → se conserva serbie
  'somalia',                           -- somalia → se conserva somalie
  'south-africa',                      -- sudáfrica → se conserva afrique_du_sud
  'spain',                             -- españa → se conserva espagne
  'sri-lanka',                         -- sri lanka → se conserva ceylan
  'sri_lanka_period',                  -- sri lanka → se conserva ceylan
  'sudan',                             -- sudán → se conserva soudan
  'swaziland_eswatini_section',        -- esuatini → se conserva swaziland
  'sweden_section',                    -- suecia → se conserva suede
  'switzerland',                       -- suiza → se conserva suisse
  'switzerland_group',                 -- suiza → se conserva suisse
  'syria',                             -- siria → se conserva syrie
  'syria_province',                    -- siria → se conserva syrie
  'syria_section',                     -- siria → se conserva syrie
  'tanzania',                          -- tanzania → se conserva tanzanie
  'timor_oriental',                    -- timor oriental → se conserva timor_oriental_period
  'trinite-et-tobago_section',         -- trinidad y tobago → se conserva trinite-et-tobago
  'uae',                               -- emiratos árabes unidos → se conserva emirats_arabes_unis
  'ukraine_section',                   -- ucrania → se conserva ukraine
  'united-kingdom',                    -- reino unido → se conserva royaume-uni
  'united-states',                     -- estados unidos → se conserva etats-unis
  'uzbekistan_section',                -- uzbekistán → se conserva ouzbekistan
  'vanuatu_period',                    -- vanuatu → se conserva vanuatu
  'vanuatu_section',                   -- vanuatu → se conserva vanuatu
  'venezuela_section',                 -- venezuela → se conserva venezuela
  'viet-nam',                          -- vietnam → se conserva viet_nam
  'yemen_section',                     -- yemen → se conserva yemen
  'zimbabwe_section'                  -- zimbabue → se conserva zimbabwe
);

-- Ningún nombre debería quedar duplicado. Esta consulta debe salir vacía.
select lower(trim(regexp_replace(issuer_name, '\s*\([^)]*\)\s*$', ''))) as nombre,
       string_agg(issuer_code, ', ' order by issuer_code) as cuales
from coins_regions
where visible_in_selector
group by 1
having count(*) > 1
order by 1;

select count(*) filter (where visible_in_selector) as visibles,
       count(*)                                    as total
from coins_regions;
