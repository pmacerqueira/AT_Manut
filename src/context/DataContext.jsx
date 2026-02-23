/**
 * DataContext – Estado global da aplicação.
 * Os dados são carregados da API (MySQL no cPanel) e sincronizados em tempo real.
 * Suporta modo offline: cache local (localStorage) + fila de sincronização.
 * Estrutura: clientes, categorias, subcategorias, checklistItems, maquinas, manutencoes, relatorios.
 */
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { buildFeriadosSet, proximoDiaUtil, encontrarDiaLivre, distribuirHorarios } from '../utils/diasUteis'
import { logger } from '../utils/logger'
import { saveCache, loadCache } from '../services/localCache'
import { enqueue, processQueue, queueSize, removeItem } from '../services/syncQueue'

const DataContext = createContext(null)

const INTERVALOS = {
  trimestral: { dias: 90, label: 'Trimestral' },
  semestral: { dias: 180, label: 'Semestral' },
  anual: { dias: 365, label: 'Anual' },
}

const initialCategorias = [
  { id: 'cat1', nome: 'Elevadores de veículos ligeiros e pesados', intervaloTipo: 'anual' },
  { id: 'cat2', nome: 'Compressores', intervaloTipo: 'trimestral' },
  { id: 'cat3', nome: 'Geradores', intervaloTipo: 'semestral' },
  { id: 'cat4', nome: 'Equipamentos de trabalho em pneus', intervaloTipo: 'semestral' },
]

const initialSubcategorias = [
  { id: 'sub1', categoriaId: 'cat1', nome: 'Elevador electromecânico de ligeiros 2 ou 4 colunas' },
  { id: 'sub2', categoriaId: 'cat1', nome: 'Elevador electro-hidráulico de 2 colunas' },
  { id: 'sub4', categoriaId: 'cat1', nome: 'Elevador de tesoura' },
  { id: 'sub12', categoriaId: 'cat1', nome: 'Elevador electro-hidráulico de pesados 4 colunas móveis independentes' },
  { id: 'sub13', categoriaId: 'cat1', nome: 'Elevador electromecânico de pesados com 4 colunas independentes' },
  { id: 'sub5', categoriaId: 'cat2', nome: 'Compressor de parafuso' },
  { id: 'sub14', categoriaId: 'cat2', nome: 'Compressor de parafuso com secador' },
  { id: 'sub10', categoriaId: 'cat2', nome: 'Compressor portátil diesel/gasolina' },
  { id: 'sub6', categoriaId: 'cat2', nome: 'Compressor de pistão' },
  { id: 'sub15', categoriaId: 'cat2', nome: 'Compressor de alta pressão' },
  { id: 'sub11', categoriaId: 'cat2', nome: 'Blower (soprador)' },
  { id: 'sub16', categoriaId: 'cat2', nome: 'Secadores (unidade de tratamento de ar comprimido)' },
  { id: 'sub7', categoriaId: 'cat3', nome: 'Gerador diesel' },
  { id: 'sub8', categoriaId: 'cat4', nome: 'Equilibrador de pneus' },
  { id: 'sub9', categoriaId: 'cat4', nome: 'Máquina de trocar pneus' },
]

// Checklists baseados em EN 1493:2020, DL 50/2005, DL 103/2008, Dir. 2006/42/CE
// Máx. 20 itens por equipamento; última linha obrigatória em montagem e manutenção periódica
const FINAL_LINE = 'Limpeza final do equipamento e teste em funcionamento'

const initialChecklistItems = [
  // sub1: Elevador electromecânico de ligeiros 2 ou 4 colunas (EN 1493:2020, DL 50/2005)
  { id: 'ch1', subcategoriaId: 'sub1', ordem: 1, texto: 'Marcação CE e conformidade do equipamento (Dir. 2006/42/CE)' },
  { id: 'ch2', subcategoriaId: 'sub1', ordem: 2, texto: 'Manual de instruções em português disponível e legível (DL 103/2008)' },
  { id: 'ch3', subcategoriaId: 'sub1', ordem: 3, texto: 'Declaração CE de conformidade disponível' },
  { id: 'ch4', subcategoriaId: 'sub1', ordem: 4, texto: 'Dispositivos de segurança em funcionamento correto (EN 1493:2020)' },
  { id: 'ch5', subcategoriaId: 'sub1', ordem: 5, texto: 'Condições de montagem e fixação' },
  { id: 'ch6', subcategoriaId: 'sub1', ordem: 6, texto: 'Registo de intervenções e manutenção periódica atualizado (DL 50/2005)' },
  { id: 'ch7', subcategoriaId: 'sub1', ordem: 7, texto: 'Redutor, motor e travão: ruídos, vibrações e ferodos' },
  { id: 'ch8', subcategoriaId: 'sub1', ordem: 8, texto: 'Nível de óleo do redutor e atestar se necessário' },
  { id: 'ch9', subcategoriaId: 'sub1', ordem: 9, texto: 'Cabos de aço: estado e aderência nas polias (EN 16625:2013)' },
  { id: 'ch10', subcategoriaId: 'sub1', ordem: 10, texto: 'Polias e roçadeiras em bom estado' },
  { id: 'ch11', subcategoriaId: 'sub1', ordem: 11, texto: 'Suportes de carga: bloqueio dos braços (máx. 150 mm)' },
  { id: 'ch12', subcategoriaId: 'sub1', ordem: 12, texto: 'Sistema de fim de curso e limitadores' },
  { id: 'ch13', subcategoriaId: 'sub1', ordem: 13, texto: 'Bloqueio de segurança para permanecer debaixo do elevador' },
  { id: 'ch14', subcategoriaId: 'sub1', ordem: 14, texto: 'Estado geral de conservação do equipamento' },
  { id: 'ch14b', subcategoriaId: 'sub1', ordem: 15, texto: FINAL_LINE },
  // sub2: Elevador electro-hidráulico de 2 colunas — Manutenção periódica
  { id: 'ch21', subcategoriaId: 'sub2', ordem: 1, texto: 'Marcação CE e conformidade do equipamento (Dir. 2006/42/CE)' },
  { id: 'ch22', subcategoriaId: 'sub2', ordem: 2, texto: 'Manual de instruções em português disponível e legível (DL 103/2008)' },
  { id: 'ch23', subcategoriaId: 'sub2', ordem: 3, texto: 'Declaração CE de conformidade disponível' },
  { id: 'ch24', subcategoriaId: 'sub2', ordem: 4, texto: 'Dispositivos de segurança em funcionamento correto (EN 1493:2020)' },
  { id: 'ch25', subcategoriaId: 'sub2', ordem: 5, texto: 'Condições de montagem e fixação' },
  { id: 'ch26', subcategoriaId: 'sub2', ordem: 6, texto: 'Registo de intervenções e manutenção periódica atualizado (DL 50/2005)' },
  { id: 'ch27', subcategoriaId: 'sub2', ordem: 7, texto: 'Nível de óleo da central hidráulica' },
  { id: 'ch28', subcategoriaId: 'sub2', ordem: 8, texto: 'Válvula limitadora de pressão e ausência de fugas' },
  { id: 'ch29', subcategoriaId: 'sub2', ordem: 9, texto: 'Cilindro(s) hidráulico(s): estanquicidade e funcionamento' },
  { id: 'ch30', subcategoriaId: 'sub2', ordem: 10, texto: 'Válvulas de segurança e bomba manual de subida' },
  { id: 'ch31', subcategoriaId: 'sub2', ordem: 11, texto: 'Suportes de carga: bloqueio dos braços (máx. 150 mm)' },
  { id: 'ch32', subcategoriaId: 'sub2', ordem: 12, texto: 'Sistema de fim de curso e limitadores' },
  { id: 'ch33', subcategoriaId: 'sub2', ordem: 13, texto: 'Bloqueio de segurança para permanecer debaixo do elevador' },
  { id: 'ch34', subcategoriaId: 'sub2', ordem: 14, texto: 'Estado geral de conservação do equipamento' },
  { id: 'ch34c', subcategoriaId: 'sub2', ordem: 15, texto: 'Verificação da tensão de alimentação e sequência de fases' },
  { id: 'ch34d', subcategoriaId: 'sub2', ordem: 16, texto: 'Ruídos e vibrações anormais' },
  { id: 'ch34e', subcategoriaId: 'sub2', ordem: 17, texto: 'Parafusos de ancoragem firmes' },
  { id: 'ch34f', subcategoriaId: 'sub2', ordem: 18, texto: 'Sinalização e pictogramas de segurança visíveis' },
  { id: 'ch34g', subcategoriaId: 'sub2', ordem: 19, texto: 'Teste de comando subida e descida' },
  { id: 'ch34b', subcategoriaId: 'sub2', ordem: 20, texto: FINAL_LINE },
  // sub2: MONTAGEM (Elevador electro-hidráulico 2 colunas) — EN 1493:2020, DL 50/2005, Dir. 2006/42/CE
  { id: 'ch2m01', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'mecanica', ordem: 1, texto: 'Colunas verticais (90°) e paralelas entre si' },
  { id: 'ch2m02', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'mecanica', ordem: 2, texto: 'Base de fixação e ancoragem conforme plano de fundação' },
  { id: 'ch2m03', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'mecanica', ordem: 3, texto: 'Cabos de aço de sincronização conectados e tensionados' },
  { id: 'ch2m04', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'mecanica', ordem: 4, texto: 'Braços de suporte instalados e bloqueio operacional' },
  { id: 'ch2m05', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'mecanica', ordem: 5, texto: 'Placa de passagem e carros de elevação montados' },
  { id: 'ch2m06', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'electrica', ordem: 6, texto: 'Ligação elétrica conforme especificações (400V/50Hz)' },
  { id: 'ch2m07', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'electrica', ordem: 7, texto: 'Aterramento e proteções elétricas instaladas' },
  { id: 'ch2m08', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'electrica', ordem: 8, texto: 'Unidade de controlo e interruptor de limite montados' },
  { id: 'ch2m09', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'hidraulica', ordem: 9, texto: 'Linhas hidráulicas conectadas e sem fugas' },
  { id: 'ch2m10', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'hidraulica', ordem: 10, texto: 'Óleo hidráulico HLP 32 (cerca de 80% do tanque)' },
  { id: 'ch2m11', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'hidraulica', ordem: 11, texto: 'Unidade motora e bomba instaladas' },
  { id: 'ch2m12', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'seguranca', ordem: 12, texto: 'Travas de segurança instaladas e funcionais' },
  { id: 'ch2m13', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'seguranca', ordem: 13, texto: 'Bloqueio dos braços (máx. 150 mm) — EN 1493:2020' },
  { id: 'ch2m14', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'seguranca', ordem: 14, texto: 'Marcação CE, manual em português e declaração CE (Dir. 2006/42/CE)' },
  { id: 'ch2m15', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'electrica', ordem: 15, texto: 'Verificação da tensão de alimentação e sequência de fases' },
  { id: 'ch2m16', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'seguranca', ordem: 16, texto: 'Sinalização de aviso e pictogramas de segurança visíveis' },
  { id: 'ch2m17', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'teste', ordem: 17, texto: 'Teste de subida e descida em vazio (vários ciclos)' },
  { id: 'ch2m18', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'teste', ordem: 18, texto: 'Verificação de ruído e funcionamento suave (≤70 dB)' },
  { id: 'ch2m19', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'teste', ordem: 19, texto: 'Vias de evacuação e área de circulação livres' },
  { id: 'ch2m20', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'teste', ordem: 20, texto: FINAL_LINE },
  // sub4: Elevador de tesoura (electro-hidráulico)
  { id: 'ch61', subcategoriaId: 'sub4', ordem: 1, texto: 'Marcação CE e conformidade do equipamento (Dir. 2006/42/CE)' },
  { id: 'ch62', subcategoriaId: 'sub4', ordem: 2, texto: 'Manual de instruções em português disponível e legível (DL 103/2008)' },
  { id: 'ch63', subcategoriaId: 'sub4', ordem: 3, texto: 'Declaração CE de conformidade disponível' },
  { id: 'ch64', subcategoriaId: 'sub4', ordem: 4, texto: 'Dispositivos de segurança em funcionamento correto (EN 1493:2020)' },
  { id: 'ch65', subcategoriaId: 'sub4', ordem: 5, texto: 'Integridade estrutural: trincas ou danos nos componentes' },
  { id: 'ch66', subcategoriaId: 'sub4', ordem: 6, texto: 'Guarda-corpo e proteções em boas condições' },
  { id: 'ch67', subcategoriaId: 'sub4', ordem: 7, texto: 'Comandos e botão de emergência: teste de funcionamento' },
  { id: 'ch68', subcategoriaId: 'sub4', ordem: 8, texto: 'Limitadores de curso operacionais' },
  { id: 'ch69', subcategoriaId: 'sub4', ordem: 9, texto: 'Piso da plataforma: estabilidade e antiderrapante' },
  { id: 'ch70', subcategoriaId: 'sub4', ordem: 10, texto: 'Sistema hidráulico: verificar vazamentos de óleo' },
  { id: 'ch71', subcategoriaId: 'sub4', ordem: 11, texto: 'Cilindros hidráulicos: funcionamento e estanquicidade' },
  { id: 'ch72', subcategoriaId: 'sub4', ordem: 12, texto: 'Articulações e dobradiças: desgaste e lubrificação' },
  { id: 'ch73', subcategoriaId: 'sub4', ordem: 13, texto: 'Registo de intervenções e manutenção periódica atualizado (DL 50/2005)' },
  { id: 'ch74', subcategoriaId: 'sub4', ordem: 14, texto: 'Estado geral de conservação do equipamento' },
  { id: 'ch74c', subcategoriaId: 'sub4', ordem: 15, texto: 'Verificação da tensão de alimentação e sequência de fases' },
  { id: 'ch74d', subcategoriaId: 'sub4', ordem: 16, texto: 'Parafusos de expansão e ancoragem firmes' },
  { id: 'ch74e', subcategoriaId: 'sub4', ordem: 17, texto: 'Sinalização e pictogramas de segurança visíveis' },
  { id: 'ch74f', subcategoriaId: 'sub4', ordem: 18, texto: 'Teste de comando subida e descida' },
  { id: 'ch74g', subcategoriaId: 'sub4', ordem: 19, texto: 'Nivelamento das plataformas em altura máxima' },
  { id: 'ch74b', subcategoriaId: 'sub4', ordem: 20, texto: FINAL_LINE },
  // sub4: MONTAGEM (Elevador de tesoura) — EN 1493:2020, DL 50/2005, Dir. 2006/42/CE
  { id: 'ch4m01', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'mecanica', ordem: 1, texto: 'Base de cimento/concreto conforme plano (espessura ≥150mm, nivelamento ≤10mm)' },
  { id: 'ch4m02', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'mecanica', ordem: 2, texto: 'Placas de base e ancoragem com parafusos de expansão' },
  { id: 'ch4m03', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'mecanica', ordem: 3, texto: 'Plataformas de elevação (estrutura tesoura) montadas e paralelas entre si' },
  { id: 'ch4m04', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'mecanica', ordem: 4, texto: 'Espaçamento entre plataformas conforme especificação do fabricante' },
  { id: 'ch4m05', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'mecanica', ordem: 5, texto: 'Articulações e pinos da tesoura montados e lubrificados' },
  { id: 'ch4m06', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'electrica', ordem: 6, texto: 'Ligação elétrica conforme especificações (400V/50Hz ou 230V)' },
  { id: 'ch4m07', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'electrica', ordem: 7, texto: 'Aterramento e proteções elétricas instaladas' },
  { id: 'ch4m08', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'electrica', ordem: 8, texto: 'Caixa de comandos, interruptores de fim de curso e limitadores montados' },
  { id: 'ch4m09', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'hidraulica', ordem: 9, texto: 'Mangueiras/tubos hidráulicos conectados e sem fugas' },
  { id: 'ch4m10', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'hidraulica', ordem: 10, texto: 'Óleo hidráulico no reservatório (conforme manual do fabricante)' },
  { id: 'ch4m11', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'hidraulica', ordem: 11, texto: 'Unidade de bomba e cilindros hidráulicos instalados' },
  { id: 'ch4m12', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'seguranca', ordem: 12, texto: 'Trincos de segurança (bloqueio mecânico) instalados e funcionais' },
  { id: 'ch4m13', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'seguranca', ordem: 13, texto: 'Bloqueio dos braços (máx. 150 mm) — EN 1493:2020' },
  { id: 'ch4m14', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'seguranca', ordem: 14, texto: 'Marcação CE, manual em português e declaração CE (Dir. 2006/42/CE)' },
  { id: 'ch4m15', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'electrica', ordem: 15, texto: 'Verificação da tensão de alimentação e sequência de fases' },
  { id: 'ch4m16', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'seguranca', ordem: 16, texto: 'Sinalização de aviso e pictogramas de segurança visíveis' },
  { id: 'ch4m17', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'teste', ordem: 17, texto: 'Teste de subida e descida em vazio; sincronização das plataformas' },
  { id: 'ch4m18', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'teste', ordem: 18, texto: 'Verificação de ruído e funcionamento suave (≤70 dB)' },
  { id: 'ch4m19', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'teste', ordem: 19, texto: 'Vias de evacuação e área de circulação livres' },
  { id: 'ch4m20', subcategoriaId: 'sub4', tipo: 'montagem', grupo: 'teste', ordem: 20, texto: FINAL_LINE },
  // sub12: MONTAGEM (Elevador electro-hidráulico pesados 4 colunas móveis independentes)
  { id: 'ch12m01', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'mecanica', ordem: 1, texto: 'Pavimento conforme plano (carga ≥5t/m² por coluna, cimento ou betão)' },
  { id: 'ch12m02', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'mecanica', ordem: 2, texto: 'Posicionamento das 4 colunas verticais conforme dimensões do fabricante' },
  { id: 'ch12m03', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'mecanica', ordem: 3, texto: 'Rodas articuladas e base côncava assente no solo em cada coluna' },
  { id: 'ch12m04', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'mecanica', ordem: 4, texto: 'Alinhamento e paralelismo das 4 colunas; espaço ≥2000mm à volta do veículo' },
  { id: 'ch12m05', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'mecanica', ordem: 5, texto: 'Suportes de carga (forklift) instalados em cada coluna e bloqueio operacional' },
  { id: 'ch12m06', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'electrica', ordem: 6, texto: 'Ligação elétrica 400V trifásico 50Hz conforme especificações' },
  { id: 'ch12m07', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'electrica', ordem: 7, texto: 'Cabos entre coluna principal e secundárias conectados conforme diagrama' },
  { id: 'ch12m08', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'electrica', ordem: 8, texto: 'Caixas de controlo principal e secundárias, interruptores de fim de curso e 24V' },
  { id: 'ch12m09', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'hidraulica', ordem: 9, texto: 'Linhas hidráulicas conectadas entre central e cilindros (sem fugas)' },
  { id: 'ch12m10', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'hidraulica', ordem: 10, texto: 'Óleo hidráulico HLP no reservatório (conforme manual do fabricante)' },
  { id: 'ch12m11', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'hidraulica', ordem: 11, texto: 'Unidade de bomba e cilindros telescópicos instalados em cada coluna' },
  { id: 'ch12m12', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'seguranca', ordem: 12, texto: 'Travas de segurança e cabo de segurança instalados e funcionais' },
  { id: 'ch12m13', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'seguranca', ordem: 13, texto: 'Bloqueio dos braços (máx. 150 mm) — EN 1493:2020' },
  { id: 'ch12m14', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'seguranca', ordem: 14, texto: 'Marcação CE, manual em português e declaração CE (Dir. 2006/42/CE)' },
  { id: 'ch12m15', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'electrica', ordem: 15, texto: 'Verificação da tensão de alimentação e sequência de fases (RAV261)' },
  { id: 'ch12m16', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'seguranca', ordem: 16, texto: 'Sinalização de aviso e pictogramas de segurança visíveis' },
  { id: 'ch12m17', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'teste', ordem: 17, texto: 'Teste de sincronização das 4 colunas em subida e descida' },
  { id: 'ch12m18', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'teste', ordem: 18, texto: 'Verificação de ruído e funcionamento suave' },
  { id: 'ch12m19', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'teste', ordem: 19, texto: 'Comando subida/descida e fim de curso operacionais' },
  { id: 'ch12m20', subcategoriaId: 'sub12', tipo: 'montagem', grupo: 'teste', ordem: 20, texto: FINAL_LINE },
  // sub12: Elevador electro-hidráulico de pesados 4 colunas móveis independentes
  { id: 'ch81', subcategoriaId: 'sub12', ordem: 1, texto: 'Marcação CE e conformidade do equipamento (Dir. 2006/42/CE)' },
  { id: 'ch82', subcategoriaId: 'sub12', ordem: 2, texto: 'Manual de instruções em português disponível e legível (DL 103/2008)' },
  { id: 'ch83', subcategoriaId: 'sub12', ordem: 3, texto: 'Declaração CE de conformidade disponível' },
  { id: 'ch84', subcategoriaId: 'sub12', ordem: 4, texto: 'Dispositivos de segurança em funcionamento correto (EN 1493:2020)' },
  { id: 'ch85', subcategoriaId: 'sub12', ordem: 5, texto: 'Condições de montagem e fixação' },
  { id: 'ch86', subcategoriaId: 'sub12', ordem: 6, texto: 'Registo de intervenções e manutenção periódica atualizado (DL 50/2005)' },
  { id: 'ch87', subcategoriaId: 'sub12', ordem: 7, texto: 'Nível de óleo da central hidráulica' },
  { id: 'ch88', subcategoriaId: 'sub12', ordem: 8, texto: 'Válvula limitadora de pressão e ausência de fugas' },
  { id: 'ch89', subcategoriaId: 'sub12', ordem: 9, texto: 'Sincronização das 4 colunas móveis independentes' },
  { id: 'ch90', subcategoriaId: 'sub12', ordem: 10, texto: 'Cilindros telescópicos: estanquicidade em cada coluna' },
  { id: 'ch91', subcategoriaId: 'sub12', ordem: 11, texto: 'Válvulas de segurança e bomba manual de subida' },
  { id: 'ch92', subcategoriaId: 'sub12', ordem: 12, texto: 'Suportes de carga e bloqueio dos braços' },
  { id: 'ch93', subcategoriaId: 'sub12', ordem: 13, texto: 'Sistema de fim de curso e limitadores' },
  { id: 'ch94', subcategoriaId: 'sub12', ordem: 14, texto: 'Estado geral de conservação do equipamento' },
  { id: 'ch94c', subcategoriaId: 'sub12', ordem: 15, texto: 'Verificação da tensão de alimentação e sequência de fases' },
  { id: 'ch94d', subcategoriaId: 'sub12', ordem: 16, texto: 'Desgaste da porca principal e cabo de segurança (RAV261)' },
  { id: 'ch94e', subcategoriaId: 'sub12', ordem: 17, texto: 'Sinalização e pictogramas de segurança visíveis' },
  { id: 'ch94f', subcategoriaId: 'sub12', ordem: 18, texto: 'Teste de comando subida e descida' },
  { id: 'ch94g', subcategoriaId: 'sub12', ordem: 19, texto: 'Controlo fim de curso e movimento do carrinho' },
  { id: 'ch94b', subcategoriaId: 'sub12', ordem: 20, texto: FINAL_LINE },
  // sub13: Elevador electromecânico de pesados 4 colunas independentes
  { id: 'ch101', subcategoriaId: 'sub13', ordem: 1, texto: 'Marcação CE e conformidade do equipamento (Dir. 2006/42/CE)' },
  { id: 'ch102', subcategoriaId: 'sub13', ordem: 2, texto: 'Manual de instruções em português disponível e legível (DL 103/2008)' },
  { id: 'ch103', subcategoriaId: 'sub13', ordem: 3, texto: 'Declaração CE de conformidade disponível' },
  { id: 'ch104', subcategoriaId: 'sub13', ordem: 4, texto: 'Dispositivos de segurança em funcionamento correto (EN 1493:2020)' },
  { id: 'ch105', subcategoriaId: 'sub13', ordem: 5, texto: 'Condições de montagem e fixação' },
  { id: 'ch106', subcategoriaId: 'sub13', ordem: 6, texto: 'Registo de intervenções e manutenção periódica atualizado (DL 50/2005)' },
  { id: 'ch107', subcategoriaId: 'sub13', ordem: 7, texto: 'Redutor, motor e travão: ruídos e vibrações' },
  { id: 'ch108', subcategoriaId: 'sub13', ordem: 8, texto: 'Sincronização das 4 colunas independentes' },
  { id: 'ch109', subcategoriaId: 'sub13', ordem: 9, texto: 'Cabos de aço: estado e aderência (EN 16625:2013)' },
  { id: 'ch110', subcategoriaId: 'sub13', ordem: 10, texto: 'Polias, roçadeiras e guias' },
  { id: 'ch111', subcategoriaId: 'sub13', ordem: 11, texto: 'Suportes de carga e bloqueio dos braços' },
  { id: 'ch112', subcategoriaId: 'sub13', ordem: 12, texto: 'Sistema de fim de curso e limitadores' },
  { id: 'ch113', subcategoriaId: 'sub13', ordem: 13, texto: 'Bloqueio de segurança para permanecer debaixo do elevador' },
  { id: 'ch114', subcategoriaId: 'sub13', ordem: 14, texto: 'Estado geral de conservação do equipamento' },
  { id: 'ch114b', subcategoriaId: 'sub13', ordem: 15, texto: FINAL_LINE },
  // Compressor de parafuso (Dir. 2006/42/CE, DL 50/2005)
  { id: 'ch201', subcategoriaId: 'sub5', ordem: 1, texto: 'Segurança operacional conforme manual de serviço (Dir. 2006/42/CE)' },
  { id: 'ch202', subcategoriaId: 'sub5', ordem: 2, texto: 'Marcação CE, manual em português e declaração de conformidade' },
  { id: 'ch203', subcategoriaId: 'sub5', ordem: 3, texto: 'Registo de intervenções e manutenção atualizado (DL 50/2005)' },
  { id: 'ch204', subcategoriaId: 'sub5', ordem: 4, texto: 'Inspecionar vazamentos de ar ou óleo em conexões e tubulações' },
  { id: 'ch205', subcategoriaId: 'sub5', ordem: 5, texto: 'Nível de óleo e drenar condensado dos reservatórios e separadores' },
  { id: 'ch206', subcategoriaId: 'sub5', ordem: 6, texto: 'Limpar resfriadores/arrefecedores e filtro de ar' },
  { id: 'ch207', subcategoriaId: 'sub5', ordem: 7, texto: 'Verificar correias: tensão e estado (substituir conforme fabricante)' },
  { id: 'ch208', subcategoriaId: 'sub5', ordem: 8, texto: 'Verificar transmissão motor-airend, válvulas e regulador proporcional' },
  { id: 'ch209', subcategoriaId: 'sub5', ordem: 9, texto: 'Substituir filtro de ar, filtro de óleo e separador ar/óleo conforme especificação' },
  { id: 'ch210', subcategoriaId: 'sub5', ordem: 10, texto: 'Trocar óleo lubrificante (conforme manual do fabricante)' },
  { id: 'ch211', subcategoriaId: 'sub5', ordem: 11, texto: 'Testar válvula de segurança, pressostato e termostato' },
  { id: 'ch212', subcategoriaId: 'sub5', ordem: 12, texto: 'Verificar válvulas de alívio e descarga de pressão' },
  { id: 'ch213', subcategoriaId: 'sub5', ordem: 13, texto: 'Verificar cabos elétricos, terminais e relés de sobrecarga' },
  { id: 'ch214', subcategoriaId: 'sub5', ordem: 14, texto: 'Monitorar indicadores: pressão de descarga e temperatura de operação' },
  { id: 'ch215', subcategoriaId: 'sub5', ordem: 15, texto: FINAL_LINE },
  // Compressor de parafuso com secador
  { id: 'ch301', subcategoriaId: 'sub14', ordem: 1, texto: 'Marcação CE, manual e declaração de conformidade (Dir. 2006/42/CE)' },
  { id: 'ch302', subcategoriaId: 'sub14', ordem: 2, texto: 'Registo de manutenção atualizado (DL 50/2005)' },
  { id: 'ch303', subcategoriaId: 'sub14', ordem: 3, texto: 'Itens compressor: filtros, óleo, separador ar/óleo' },
  { id: 'ch304', subcategoriaId: 'sub14', ordem: 4, texto: 'Limpar condensador refrigerante e alhetas de arrefecimento' },
  { id: 'ch305', subcategoriaId: 'sub14', ordem: 5, texto: 'Verificar ventilador do motor, pás e proteções' },
  { id: 'ch306', subcategoriaId: 'sub14', ordem: 6, texto: 'Purga de condensados do secador e rede de ar comprimido' },
  { id: 'ch307', subcategoriaId: 'sub14', ordem: 7, texto: 'Ponto de orvalho e fugas no circuito refrigerante' },
  { id: 'ch308', subcategoriaId: 'sub14', ordem: 8, texto: 'Verificar pressostato e pressão de corte (alta, baixa)' },
  { id: 'ch309', subcategoriaId: 'sub14', ordem: 9, texto: 'Trocar elemento(s) dos filtros de linha e tratamento' },
  { id: 'ch310', subcategoriaId: 'sub14', ordem: 10, texto: 'Temperatura ar comprimido: entrada e saída' },
  { id: 'ch310b', subcategoriaId: 'sub14', ordem: 11, texto: 'Verificar válvula de segurança e dispositivos de proteção' },
  { id: 'ch310c', subcategoriaId: 'sub14', ordem: 12, texto: 'Verificar vazamentos em conexões e tubulações' },
  { id: 'ch310d', subcategoriaId: 'sub14', ordem: 13, texto: 'Estado geral de conservação do equipamento' },
  { id: 'ch310e', subcategoriaId: 'sub14', ordem: 14, texto: 'Teste funcionamento: arranque, vazio, carga, paragem' },
  { id: 'ch310f', subcategoriaId: 'sub14', ordem: 15, texto: FINAL_LINE },
  // Compressor portátil diesel/gasolina
  { id: 'ch251', subcategoriaId: 'sub10', ordem: 1, texto: 'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)' },
  { id: 'ch252', subcategoriaId: 'sub10', ordem: 2, texto: 'Registo de manutenção atualizado (DL 50/2005)' },
  { id: 'ch253', subcategoriaId: 'sub10', ordem: 3, texto: 'Nível de óleo lubrificante e combustível (qualidade)' },
  { id: 'ch254', subcategoriaId: 'sub10', ordem: 4, texto: 'Nível do líquido de arrefecimento (radiador com motor frio)' },
  { id: 'ch255', subcategoriaId: 'sub10', ordem: 5, texto: 'Bateria: carga, polos limpos, voltagem (12,4V–12,7V)' },
  { id: 'ch256', subcategoriaId: 'sub10', ordem: 6, texto: 'Trocar pré-filtro/filtro de combustível, óleo e filtro motor' },
  { id: 'ch257', subcategoriaId: 'sub10', ordem: 7, texto: 'Trocar cartucho separador de óleo' },
  { id: 'ch258', subcategoriaId: 'sub10', ordem: 8, texto: 'Tensão da correia do alternador; lubrificar chassi' },
  { id: 'ch259', subcategoriaId: 'sub10', ordem: 9, texto: 'Manutenção válvulas e regulador proporcional' },
  { id: 'ch260', subcategoriaId: 'sub10', ordem: 10, texto: 'Verificar válvula de segurança e dispositivos de proteção' },
  { id: 'ch261', subcategoriaId: 'sub10', ordem: 11, texto: 'Inspecionar vazamentos de ar, óleo e combustível' },
  { id: 'ch262', subcategoriaId: 'sub10', ordem: 12, texto: 'Indicadores do painel: pressão, temperatura' },
  { id: 'ch263', subcategoriaId: 'sub10', ordem: 13, texto: 'Estado geral de conservação do equipamento' },
  { id: 'ch264', subcategoriaId: 'sub10', ordem: 14, texto: 'Teste: partida, alívio, carga, parada' },
  { id: 'ch265', subcategoriaId: 'sub10', ordem: 15, texto: FINAL_LINE },
  // Compressor de pistão
  { id: 'ch351', subcategoriaId: 'sub6', ordem: 1, texto: 'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)' },
  { id: 'ch352', subcategoriaId: 'sub6', ordem: 2, texto: 'Registo de manutenção atualizado (DL 50/2005)' },
  { id: 'ch353', subcategoriaId: 'sub6', ordem: 3, texto: 'Nível de óleo entre mínimo e máximo; drenar água acumulada' },
  { id: 'ch354', subcategoriaId: 'sub6', ordem: 4, texto: 'Limpar parte externa, filtro de ar e aberturas de refrigeração' },
  { id: 'ch355', subcategoriaId: 'sub6', ordem: 5, texto: 'Verificar parafusos de fixação e vazamentos de ar ou óleo' },
  { id: 'ch356', subcategoriaId: 'sub6', ordem: 6, texto: 'Trocar óleo e limpar trocadores de calor conforme manual' },
  { id: 'ch357', subcategoriaId: 'sub6', ordem: 7, texto: 'Limpar válvulas entre cilindro e tampa (conforme especificação)' },
  { id: 'ch358', subcategoriaId: 'sub6', ordem: 8, texto: 'Verificar válvula de segurança e dispositivos de proteção' },
  { id: 'ch359', subcategoriaId: 'sub6', ordem: 9, texto: 'Testar e calibrar pressostato e manómetro' },
  { id: 'ch360', subcategoriaId: 'sub6', ordem: 10, texto: 'Verificar cabos elétricos e relés de sobrecarga' },
  { id: 'ch361', subcategoriaId: 'sub6', ordem: 11, texto: 'Monitorar indicadores de pressão e temperatura' },
  { id: 'ch362', subcategoriaId: 'sub6', ordem: 12, texto: 'Condições de montagem e fixação' },
  { id: 'ch363', subcategoriaId: 'sub6', ordem: 13, texto: 'Estado geral de conservação do equipamento' },
  { id: 'ch364', subcategoriaId: 'sub6', ordem: 14, texto: 'Teste: arranque, carga, paragem' },
  { id: 'ch364b', subcategoriaId: 'sub6', ordem: 15, texto: FINAL_LINE },
  // Compressor de alta pressão
  { id: 'ch401', subcategoriaId: 'sub15', ordem: 1, texto: 'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)' },
  { id: 'ch402', subcategoriaId: 'sub15', ordem: 2, texto: 'Registo de manutenção atualizado (DL 50/2005)' },
  { id: 'ch403', subcategoriaId: 'sub15', ordem: 3, texto: 'Nível de óleo; drenar condensado dos reservatórios e separadores' },
  { id: 'ch404', subcategoriaId: 'sub15', ordem: 4, texto: 'Limpar alhetas do pós-refrigerador, arrefecedor de óleo e filtro de ar' },
  { id: 'ch405', subcategoriaId: 'sub15', ordem: 5, texto: 'Inspecionar vazamentos em conexões e tubulações' },
  { id: 'ch406', subcategoriaId: 'sub15', ordem: 6, texto: 'Trocar óleo, filtro de ar e separador de óleo conforme especificação' },
  { id: 'ch407', subcategoriaId: 'sub15', ordem: 7, texto: 'Verificar válvula de segurança e dispositivos de proteção' },
  { id: 'ch408', subcategoriaId: 'sub15', ordem: 8, texto: 'Verificar manómetros, indicadores e definições de pressão' },
  { id: 'ch409', subcategoriaId: 'sub15', ordem: 9, texto: 'Aperto de parafusos de fixação' },
  { id: 'ch410', subcategoriaId: 'sub15', ordem: 10, texto: 'Verificar cabos elétricos e proteções' },
  { id: 'ch411', subcategoriaId: 'sub15', ordem: 11, texto: 'Monitorar pressão de descarga e temperatura' },
  { id: 'ch412', subcategoriaId: 'sub15', ordem: 12, texto: 'Condições de montagem e fixação' },
  { id: 'ch413', subcategoriaId: 'sub15', ordem: 13, texto: 'Estado geral de conservação do equipamento' },
  { id: 'ch414', subcategoriaId: 'sub15', ordem: 14, texto: 'Teste: arranque, carga, paragem' },
  { id: 'ch414b', subcategoriaId: 'sub15', ordem: 15, texto: FINAL_LINE },
  // Secadores (unidade tratamento ar comprimido)
  { id: 'ch451', subcategoriaId: 'sub16', ordem: 1, texto: 'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)' },
  { id: 'ch452', subcategoriaId: 'sub16', ordem: 2, texto: 'Registo de manutenção atualizado (DL 50/2005)' },
  { id: 'ch453', subcategoriaId: 'sub16', ordem: 3, texto: 'Limpar condensador refrigerante e alhetas' },
  { id: 'ch454', subcategoriaId: 'sub16', ordem: 4, texto: 'Verificar funcionamento ventilador e grelhas' },
  { id: 'ch455', subcategoriaId: 'sub16', ordem: 5, texto: 'Drenar condensados do secador e purga' },
  { id: 'ch456', subcategoriaId: 'sub16', ordem: 6, texto: 'Inspecionar fugas no circuito refrigerante' },
  { id: 'ch457', subcategoriaId: 'sub16', ordem: 7, texto: 'Trocar elementos dos filtros de linha conforme especificação' },
  { id: 'ch458', subcategoriaId: 'sub16', ordem: 8, texto: 'Verificar temperatura ar entrada e saída; ponto de orvalho' },
  { id: 'ch459', subcategoriaId: 'sub16', ordem: 9, texto: 'Verificar pressostato (alta/baixa pressão)' },
  { id: 'ch460', subcategoriaId: 'sub16', ordem: 10, texto: 'Verificar válvulas de segurança e dispositivos de proteção' },
  { id: 'ch461', subcategoriaId: 'sub16', ordem: 11, texto: 'Condições de montagem e fixação' },
  { id: 'ch461b', subcategoriaId: 'sub16', ordem: 12, texto: 'Estado geral de conservação do equipamento' },
  { id: 'ch461c', subcategoriaId: 'sub16', ordem: 13, texto: 'Verificar vazamentos em conexões' },
  { id: 'ch461d', subcategoriaId: 'sub16', ordem: 14, texto: 'Teste: arranque, vazio, carga, paragem' },
  { id: 'ch461e', subcategoriaId: 'sub16', ordem: 15, texto: FINAL_LINE },
  // Blower / Soprador
  { id: 'ch271', subcategoriaId: 'sub11', ordem: 1, texto: 'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)' },
  { id: 'ch272', subcategoriaId: 'sub11', ordem: 2, texto: 'Registo de manutenção atualizado (DL 50/2005)' },
  { id: 'ch273', subcategoriaId: 'sub11', ordem: 3, texto: 'Condições de segurança conforme manual de serviço' },
  { id: 'ch274', subcategoriaId: 'sub11', ordem: 4, texto: 'Proteções e extrator de pó da hélice em bom estado' },
  { id: 'ch275', subcategoriaId: 'sub11', ordem: 5, texto: 'Verificar mecanismo do bloco, vedação do eixo e manga de proteção' },
  { id: 'ch276', subcategoriaId: 'sub11', ordem: 6, texto: 'Correias em V e polia: tensão e estado' },
  { id: 'ch277', subcategoriaId: 'sub11', ordem: 7, texto: 'Nível de óleo; trocar filtro de ar e filtro de óleo conforme especificação' },
  { id: 'ch278', subcategoriaId: 'sub11', ordem: 8, texto: 'Tubos de drenagem, conexões e compensadores' },
  { id: 'ch279', subcategoriaId: 'sub11', ordem: 9, texto: 'Válvulas de partida, retenção e alívio de pressão' },
  { id: 'ch280', subcategoriaId: 'sub11', ordem: 10, texto: 'Cabos elétricos, terminais e relés de sobrecarga' },
  { id: 'ch281', subcategoriaId: 'sub11', ordem: 11, texto: 'Indicadores e consumo de energia' },
  { id: 'ch282', subcategoriaId: 'sub11', ordem: 12, texto: 'Limpar superfícies da unidade e do motor' },
  { id: 'ch283', subcategoriaId: 'sub11', ordem: 13, texto: 'Estado geral de conservação do equipamento' },
  { id: 'ch284', subcategoriaId: 'sub11', ordem: 14, texto: 'Teste: partida, carregamento, parada' },
  { id: 'ch285', subcategoriaId: 'sub11', ordem: 15, texto: FINAL_LINE },
  // sub7: Gerador diesel (Dir. 2006/42/CE, DL 50/2005)
  { id: 'ch701', subcategoriaId: 'sub7', ordem: 1, texto: 'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)' },
  { id: 'ch702', subcategoriaId: 'sub7', ordem: 2, texto: 'Registo de manutenção atualizado (DL 50/2005)' },
  { id: 'ch703', subcategoriaId: 'sub7', ordem: 3, texto: 'Nível de óleo lubrificante (vareta de medição)' },
  { id: 'ch704', subcategoriaId: 'sub7', ordem: 4, texto: 'Nível de combustível e qualidade do diesel' },
  { id: 'ch705', subcategoriaId: 'sub7', ordem: 5, texto: 'Nível do líquido de arrefecimento (radiador com motor frio)' },
  { id: 'ch706', subcategoriaId: 'sub7', ordem: 6, texto: 'Bateria: carga, polos limpos, voltagem (12,4V–12,7V)' },
  { id: 'ch707', subcategoriaId: 'sub7', ordem: 7, texto: 'Inspecionar vazamentos de óleo, diesel e líquido de arrefecimento' },
  { id: 'ch708', subcategoriaId: 'sub7', ordem: 8, texto: 'Filtro de ar e filtro de combustível' },
  { id: 'ch709', subcategoriaId: 'sub7', ordem: 9, texto: 'Correias, mangueiras e abraçadeiras do sistema de arrefecimento' },
  { id: 'ch710', subcategoriaId: 'sub7', ordem: 10, texto: 'Ventilador e colmeia do radiador' },
  { id: 'ch711', subcategoriaId: 'sub7', ordem: 11, texto: 'Sistema elétrico: terminais e proteções' },
  { id: 'ch712', subcategoriaId: 'sub7', ordem: 12, texto: 'Indicadores do painel: temperatura, pressão óleo, tensão' },
  { id: 'ch713', subcategoriaId: 'sub7', ordem: 13, texto: 'Condições de montagem, fixação e ventilação' },
  { id: 'ch714', subcategoriaId: 'sub7', ordem: 14, texto: 'Estado geral de conservação do equipamento' },
  { id: 'ch715', subcategoriaId: 'sub7', ordem: 15, texto: FINAL_LINE },
  // sub8: Equilibrador de pneus (Dir. 2006/42/CE, DL 50/2005)
  { id: 'ch801', subcategoriaId: 'sub8', ordem: 1, texto: 'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)' },
  { id: 'ch802', subcategoriaId: 'sub8', ordem: 2, texto: 'Registo de manutenção atualizado (DL 50/2005)' },
  { id: 'ch803', subcategoriaId: 'sub8', ordem: 3, texto: 'Proteções e dispositivos de segurança em funcionamento' },
  { id: 'ch804', subcategoriaId: 'sub8', ordem: 4, texto: 'Condições de montagem e fixação à bancada' },
  { id: 'ch805', subcategoriaId: 'sub8', ordem: 5, texto: 'Eixo e cone de fixação: estado e folgas' },
  { id: 'ch806', subcategoriaId: 'sub8', ordem: 6, texto: 'Cabos elétricos e proteções' },
  { id: 'ch807', subcategoriaId: 'sub8', ordem: 7, texto: 'Lubrificação de eixos e rolamentos' },
  { id: 'ch808', subcategoriaId: 'sub8', ordem: 8, texto: 'Tampa de proteção do eixo e sensores' },
  { id: 'ch809', subcategoriaId: 'sub8', ordem: 9, texto: 'Calibração e precisão da medição de desequilíbrio' },
  { id: 'ch810', subcategoriaId: 'sub8', ordem: 10, texto: 'Comandos e botão de emergência' },
  { id: 'ch811', subcategoriaId: 'sub8', ordem: 11, texto: 'Display e indicadores em funcionamento' },
  { id: 'ch812', subcategoriaId: 'sub8', ordem: 12, texto: 'Vibrações anormais e ruídos' },
  { id: 'ch813', subcategoriaId: 'sub8', ordem: 13, texto: 'Estado geral de conservação do equipamento' },
  { id: 'ch814', subcategoriaId: 'sub8', ordem: 14, texto: 'Teste de equilíbrio com roda de referência' },
  { id: 'ch815', subcategoriaId: 'sub8', ordem: 15, texto: FINAL_LINE },
  // sub9: Máquina de trocar pneus (Dir. 2006/42/CE, DL 50/2005)
  { id: 'ch901', subcategoriaId: 'sub9', ordem: 1, texto: 'Marcação CE e conformidade; manual em português (Dir. 2006/42/CE)' },
  { id: 'ch902', subcategoriaId: 'sub9', ordem: 2, texto: 'Registo de manutenção atualizado (DL 50/2005)' },
  { id: 'ch903', subcategoriaId: 'sub9', ordem: 3, texto: 'Proteções e dispositivos de segurança em funcionamento' },
  { id: 'ch904', subcategoriaId: 'sub9', ordem: 4, texto: 'Condições de montagem e fixação' },
  { id: 'ch905', subcategoriaId: 'sub9', ordem: 5, texto: 'Braços de trabalho: folgas, lubrificação e estado' },
  { id: 'ch906', subcategoriaId: 'sub9', ordem: 6, texto: 'Desmontador de pneus: bordas e ferramentas em bom estado' },
  { id: 'ch907', subcategoriaId: 'sub9', ordem: 7, texto: 'Sistema pneumático: pressão, fugas e válvulas' },
  { id: 'ch908', subcategoriaId: 'sub9', ordem: 8, texto: 'Cabos elétricos e proteções do motor' },
  { id: 'ch909', subcategoriaId: 'sub9', ordem: 9, texto: 'Pedal ou comando de controlo de segurança' },
  { id: 'ch910', subcategoriaId: 'sub9', ordem: 10, texto: 'Comandos e botão de emergência' },
  { id: 'ch911', subcategoriaId: 'sub9', ordem: 11, texto: 'Mesa rotativa: funcionamento e travão' },
  { id: 'ch912', subcategoriaId: 'sub9', ordem: 12, texto: 'Parafusos de fixação e articulações' },
  { id: 'ch913', subcategoriaId: 'sub9', ordem: 13, texto: 'Estado geral de conservação do equipamento' },
  { id: 'ch914', subcategoriaId: 'sub9', ordem: 14, texto: 'Teste de desmontagem/montagem com pneu e jante' },
  { id: 'ch915', subcategoriaId: 'sub9', ordem: 15, texto: FINAL_LINE },
]

// ── MOCK DATA v3 — 10 clientes açorianos · Fev 2026 ──────────────────────────
// id = nif (consistente com seed MySQL e bulk_restore)
const initialClientes = [
  { id: '511234567', nif: '511234567', nome: 'Mecânica Bettencourt Lda', morada: 'Rua do Mercado, 12', codigoPostal: '9500-050', localidade: 'Ponta Delgada', telefone: '296281234', email: 'geral@mecanicabettencourt.pt' },
  { id: '512345678', nif: '512345678', nome: 'Auto Serviço Ribeira', morada: 'Av. do Porto, 45', codigoPostal: '9600-030', localidade: 'Ribeira Grande', telefone: '296472345', email: 'autoservico@ribeira.pt' },
  { id: '513456789', nif: '513456789', nome: 'Oficina Sousa & Filhos Lda', morada: 'Zona Industrial de Angra, Lote 7', codigoPostal: '9700-011', localidade: 'Angra do Heroísmo', telefone: '295212456', email: 'oficina@sousafilhos.pt' },
  { id: '514567890', nif: '514567890', nome: 'Transportes Melo Lda', morada: 'Rua da Fonte, 3', codigoPostal: '9760-410', localidade: 'Praia da Vitória', telefone: '295512567', email: 'transportes@melo.pt' },
  { id: '515678901', nif: '515678901', nome: 'Mecânica Faial Lda', morada: 'Rua Vasco da Gama, 88', codigoPostal: '9900-014', localidade: 'Horta', telefone: '292292678', email: 'mecanica@faial.pt' },
  { id: '516789012', nif: '516789012', nome: 'Auto Pico Lda', morada: 'Caminho de Baixo, 22', codigoPostal: '9950-302', localidade: 'Madalena', telefone: '292622789', email: 'autopico@mail.pt' },
  { id: '517890123', nif: '517890123', nome: 'Serviços Técnicos Açores Lda', morada: 'Parque Empresarial de Ponta Delgada, Lote 4', codigoPostal: '9500-801', localidade: 'Ponta Delgada', telefone: '296305890', email: 'geral@stacores.pt' },
  { id: '518901234', nif: '518901234', nome: 'Oficina Graciosa Lda', morada: 'Rua da Igreja, 15', codigoPostal: '9880-352', localidade: 'Santa Cruz da Graciosa', telefone: '292780123', email: 'oficina@graciosa.pt' },
  { id: '519012345', nif: '519012345', nome: 'Mecânica Flores Lda', morada: 'Largo do Município, 7', codigoPostal: '9970-305', localidade: 'Santa Cruz das Flores', telefone: '292590456', email: 'mecanica@flores.pt' },
  { id: '510123456', nif: '510123456', nome: 'Auto São Jorge Lda', morada: 'Rua do Comércio, 33', codigoPostal: '9800-521', localidade: 'Calheta', telefone: '295410789', email: 'auto@saojorge.pt' },
]

// Subcategorias com contador de horas (elétricos, diesel/gasolina)
export const SUBCATEGORIAS_COM_CONTADOR_HORAS = ['sub1', 'sub2', 'sub4', 'sub5', 'sub6', 'sub7', 'sub10', 'sub11', 'sub12', 'sub13', 'sub14', 'sub15', 'sub16']

// Subcategorias de compressores KAESER (suportam planos A/B/C/D)
export const SUBCATEGORIAS_COMPRESSOR = ['sub5', 'sub6', 'sub10', 'sub11', 'sub14', 'sub15']

// Intervalos de manutenção KAESER (horas de serviço)
export const INTERVALOS_KAESER = {
  A: { horas: 3000,  label: 'Tipo A — 3.000h / 1 ano'  },
  B: { horas: 6000,  label: 'Tipo B — 6.000h'          },
  C: { horas: 12000, label: 'Tipo C — 12.000h'         },
  D: { horas: 36000, label: 'Tipo D — 36.000h'         },
}

// Plano de referência KAESER ASK 28T (extraído do manual)
// Formato: { tipoManut, posicao, codigoArtigo, descricao, quantidade, unidade }
export const KAESER_PLANO_ASK_28T = [
  // Tipo A — 3.000h / 1 ano
  { tipoManut: 'A', posicao: '0512', codigoArtigo: '490111.00030', descricao: 'SET filtro compressor sem FSÓ', quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'A', posicao: '1600', codigoArtigo: '9.0920.10030', descricao: 'SIGMA FLUID MOL 5 l',           quantidade: 3, unidade: 'PÇ' },
  // Tipo B — 6.000h
  { tipoManut: 'B', posicao: '0510', codigoArtigo: '490111.00010', descricao: 'SET filtro compressor ASK',      quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'B', posicao: '1600', codigoArtigo: '9.0920.10030', descricao: 'SIGMA FLUID MOL 5 l',           quantidade: 3, unidade: 'PÇ' },
  { tipoManut: 'B', posicao: '9602', codigoArtigo: '8.2474.01550', descricao: 'Un. serv. cond. desc. condens.', quantidade: 1, unidade: 'PÇ' },
  // Tipo C — 12.000h
  { tipoManut: 'C', posicao: '0510', codigoArtigo: '490111.00010', descricao: 'SET filtro compressor ASK',         quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'C', posicao: '1600', codigoArtigo: '9.0920.10030', descricao: 'SIGMA FLUID MOL 5 l',              quantidade: 3, unidade: 'PÇ' },
  { tipoManut: 'C', posicao: '1801', codigoArtigo: '6.4832.0',     descricao: 'Correia de accionamento',          quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'C', posicao: '2022', codigoArtigo: '401819.0',     descricao: 'Jogo manutenção válvula RPM',      quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'C', posicao: '2042', codigoArtigo: '404249.0',     descricao: 'Jogo manutenção válv. entrada',    quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'C', posicao: '2062', codigoArtigo: '400994.00020', descricao: 'Jogo manutenção/Válvula comb.',    quantidade: 1, unidade: 'TER' },
  { tipoManut: 'C', posicao: '2102', codigoArtigo: '400706.00010', descricao: 'Jogo manutenção válvula CV',       quantidade: 1, unidade: 'TER' },
  { tipoManut: 'C', posicao: '4451', codigoArtigo: '402533.0',     descricao: 'KIT manutenção rolamentos 6209',   quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'C', posicao: '4701', codigoArtigo: '6.0034.00010', descricao: 'Rolamento rígido de esferas 60',   quantidade: 2, unidade: 'PÇ' },
  { tipoManut: 'C', posicao: '9602', codigoArtigo: '8.2474.01550', descricao: 'Un. serv. cond. desc. condens.',   quantidade: 1, unidade: 'PÇ' },
  // Tipo D — 36.000h
  { tipoManut: 'D', posicao: '0510', codigoArtigo: '490111.00010', descricao: 'SET filtro compressor ASK',         quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '1600', codigoArtigo: '9.0920.10030', descricao: 'SIGMA FLUID MOL 5 l',              quantidade: 3, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '1801', codigoArtigo: '6.4832.0',     descricao: 'Correia de accionamento',          quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '2024', codigoArtigo: '401820.1',     descricao: 'Jogo revisão válvula RPM',         quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '2044', codigoArtigo: '404250.0',     descricao: 'Jogo revisão válvula entrada',     quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '2064', codigoArtigo: '403284.00010', descricao: 'Jogo revisão/Válvula comb.',       quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '2104', codigoArtigo: '400707.00010', descricao: 'Jogo revisão válvula CV',          quantidade: 1, unidade: 'TER' },
  { tipoManut: 'D', posicao: '4451', codigoArtigo: '402533.0',     descricao: 'KIT manutenção rolamentos 6209',   quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '4701', codigoArtigo: '6.0034.00010', descricao: 'Rolamento rígido de esferas 60',   quantidade: 2, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '4920', codigoArtigo: '9.9351.0',     descricao: 'Unidade de ventilador axial Ø3',   quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '4930', codigoArtigo: '7.2751.00031', descricao: 'Ventilador do armário comando',    quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '7140', codigoArtigo: '8.2772.0',     descricao: 'Tubo flexível (7140)',             quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '7150', codigoArtigo: '8.2772.0',     descricao: 'Tubo flexível (7150)',             quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '7190', codigoArtigo: '8.2333.10040', descricao: 'Tubo flexível (7190)',             quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '7350', codigoArtigo: '403803.0',     descricao: 'Jogo conduto de comando',          quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '7365', codigoArtigo: '212229.00070', descricao: 'Tubo de descarga condensação',     quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '7563', codigoArtigo: '8.1928.1',     descricao: 'Tubo flexível (7563)',             quantidade: 1, unidade: 'PÇ' },
  { tipoManut: 'D', posicao: '9602', codigoArtigo: '8.2474.01550', descricao: 'Un. serv. cond. desc. condens.',   quantidade: 1, unidade: 'PÇ' },
]

// Tipos de documentação técnica por máquina (cumprimento legal obrigatório)
export const TIPOS_DOCUMENTO = [
  { id: 'manual_utilizador', label: 'Manual do Utilizador' },
  { id: 'declaracao_conformidade_ce', label: 'Declaração de Conformidade CE' },
  { id: 'manual_manutencao', label: 'Manual de Manutenção' },
  { id: 'lista_pecas', label: 'Lista de peças' },
  { id: 'outros', label: 'Outros' },
]

// ── MOCK DATA v4 — 23 máquinas (18 periódicas + 5 montagens) · 8 montagens (3 concluídas, 2 atraso, 3 próximas) ─
// proximaManut < 2026-02-17 = em atraso  |  >= 2026-02-17 = agendada/futura
const initialMaquinas = [
  // Cliente 1 — Mecânica Bettencourt: elevador ligeiros + comp. parafuso
  { id: 'm01', clienteNif: '511234567', subcategoriaId: 'sub1', periodicidadeManut: 'anual',      marca: 'Navel',         modelo: 'EV-4P',      numeroSerie: 'NAV-EV-001',   anoFabrico: 2021, numeroDocumentoVenda: 'FV-2021-001', proximaManut: '2026-12-10', documentos: [], ultimaManutencaoData: '2025-12-10', horasTotaisAcumuladas: 1340, horasServicoAcumuladas: 1265 },
  { id: 'm02', clienteNif: '511234567', subcategoriaId: 'sub5', periodicidadeManut: 'trimestral', marca: 'Atlas Copco',  modelo: 'GA-22',      numeroSerie: 'AC-GA22-002',  anoFabrico: 2022, numeroDocumentoVenda: 'FV-2022-002', proximaManut: '2026-01-15', documentos: [], ultimaManutencaoData: '2025-10-15', horasTotaisAcumuladas: 520, horasServicoAcumuladas: 488 },
  // Cliente 2 — Auto Serviço Ribeira: elevador hidráulico + gerador
  { id: 'm03', clienteNif: '512345678', subcategoriaId: 'sub2', periodicidadeManut: 'anual',      marca: 'Navel',         modelo: 'EH-2C',      numeroSerie: 'NAV-EH-003',   anoFabrico: 2020, numeroDocumentoVenda: 'FV-2020-003', proximaManut: '2027-01-08', documentos: [], ultimaManutencaoData: '2026-01-08', horasTotaisAcumuladas: 980, horasServicoAcumuladas: 924 },
  { id: 'm04', clienteNif: '512345678', subcategoriaId: 'sub7', periodicidadeManut: 'semestral',  marca: 'Perkins',       modelo: '404D-22',    numeroSerie: 'PRK-404-004',  anoFabrico: 2023, numeroDocumentoVenda: 'FV-2023-004', proximaManut: '2026-07-20', documentos: [], ultimaManutencaoData: '2026-01-20', horasTotaisAcumuladas: 830, horasServicoAcumuladas: 790 },
  // Cliente 3 — Oficina Sousa & Filhos: tesoura + pistão + equilibrador
  { id: 'm05', clienteNif: '513456789', subcategoriaId: 'sub4', periodicidadeManut: 'anual',      marca: 'Navel',         modelo: 'TES-5T',     numeroSerie: 'NAV-TES-005',  anoFabrico: 2019, numeroDocumentoVenda: 'FV-2019-005', proximaManut: '2027-01-22', documentos: [], ultimaManutencaoData: '2026-01-22', horasTotaisAcumuladas: 2250, horasServicoAcumuladas: 2110 },
  { id: 'm06', clienteNif: '513456789', subcategoriaId: 'sub6', periodicidadeManut: 'trimestral', marca: 'Abac',          modelo: 'B30 FM',     numeroSerie: 'ABA-B30-006',  anoFabrico: 2022, numeroDocumentoVenda: 'FV-2022-006', proximaManut: '2026-02-01', documentos: [], ultimaManutencaoData: '2025-11-01' },
  { id: 'm07', clienteNif: '513456789', subcategoriaId: 'sub8', periodicidadeManut: 'semestral',  marca: 'Corghi',        modelo: 'Artiglio 46', numeroSerie: 'COR-A46-007', anoFabrico: 2021, numeroDocumentoVenda: 'FV-2021-007', proximaManut: '2026-08-05', documentos: [], ultimaManutencaoData: '2026-02-05' },
  // Cliente 4 — Transportes Melo: muda pneus + elev. pesados hidráulico
  { id: 'm08', clienteNif: '514567890', subcategoriaId: 'sub9', periodicidadeManut: 'semestral',  marca: 'Hofmann',       modelo: 'Monty 4200', numeroSerie: 'HOF-M4200-008', anoFabrico: 2023, numeroDocumentoVenda: 'FV-2023-008', proximaManut: '2026-08-12', documentos: [], ultimaManutencaoData: '2026-02-12' },
  { id: 'm09', clienteNif: '514567890', subcategoriaId: 'sub12', periodicidadeManut: 'anual',     marca: 'Navel',         modelo: 'EH-P4',      numeroSerie: 'NAV-EHP4-009', anoFabrico: 2020, numeroDocumentoVenda: 'FV-2020-009', proximaManut: '2027-02-12', documentos: [], ultimaManutencaoData: '2026-02-12', horasTotaisAcumuladas: 1100, horasServicoAcumuladas: 1045 },
  // Cliente 5 — Mecânica Faial: elev. pesados eletromec. + comp. portátil
  { id: 'm10', clienteNif: '515678901', subcategoriaId: 'sub13', periodicidadeManut: 'anual',     marca: 'Navel',         modelo: 'EM-P4',      numeroSerie: 'NAV-EMP4-010', anoFabrico: 2022, numeroDocumentoVenda: 'FV-2022-010', proximaManut: '2026-12-05', documentos: [], ultimaManutencaoData: '2025-12-05' },
  { id: 'm11', clienteNif: '515678901', subcategoriaId: 'sub10', periodicidadeManut: 'trimestral', marca: 'Atlas Copco', modelo: 'XAS 47',     numeroSerie: 'AC-XAS47-011', anoFabrico: 2023, numeroDocumentoVenda: 'FV-2023-011', proximaManut: '2026-02-10', documentos: [], ultimaManutencaoData: '2025-11-10', horasTotaisAcumuladas: 210, horasServicoAcumuladas: 198 },
  // Cliente 6 — Auto Pico: blower + comp. parafuso c/ secador
  { id: 'm12', clienteNif: '516789012', subcategoriaId: 'sub11', periodicidadeManut: 'trimestral', marca: 'Rietschle',   modelo: 'SVC 150',    numeroSerie: 'RIE-SVC-012',  anoFabrico: 2021, numeroDocumentoVenda: 'FV-2021-012', proximaManut: '2026-05-15', documentos: [], ultimaManutencaoData: '2025-11-15', horasTotaisAcumuladas: 3400, horasServicoAcumuladas: 3210 },
  { id: 'm13', clienteNif: '516789012', subcategoriaId: 'sub14', periodicidadeManut: 'trimestral', marca: 'Atlas Copco', modelo: 'CD-11',      numeroSerie: 'AC-CD11-013',  anoFabrico: 2022, numeroDocumentoVenda: 'FV-2022-013', proximaManut: '2026-03-15', documentos: [], ultimaManutencaoData: '2025-12-15', horasTotaisAcumuladas: 680, horasServicoAcumuladas: 645 },
  // Cliente 7 — Serviços Técnicos Açores: comp. alta pressão + secador
  { id: 'm14', clienteNif: '517890123', subcategoriaId: 'sub15', periodicidadeManut: 'trimestral', marca: 'Bauer',       modelo: 'PE-100',     numeroSerie: 'BAU-PE100-014', anoFabrico: 2023, numeroDocumentoVenda: 'FV-2023-014', proximaManut: '2026-06-10', documentos: [], ultimaManutencaoData: '2025-12-10' },
  { id: 'm15', clienteNif: '517890123', subcategoriaId: 'sub16', periodicidadeManut: 'trimestral', marca: 'Atlas Copco', modelo: 'FD-50',      numeroSerie: 'AC-FD50-015',  anoFabrico: 2024, numeroDocumentoVenda: 'FV-2024-015', proximaManut: '2026-04-20', documentos: [], ultimaManutencaoData: '2025-10-20' },
  // Cliente 8 — Oficina Graciosa: elevador + compressor
  { id: 'm16', clienteNif: '518901234', subcategoriaId: 'sub1', periodicidadeManut: 'anual',      marca: 'Navel',         modelo: 'EV-2P',      numeroSerie: 'NAV-EV-016',   anoFabrico: 2020, numeroDocumentoVenda: 'FV-2020-016', proximaManut: '2026-01-25', documentos: [], ultimaManutencaoData: '2025-01-25' },
  // Cliente 9 — Mecânica Flores: gerador
  { id: 'm17', clienteNif: '519012345', subcategoriaId: 'sub7', periodicidadeManut: 'semestral',  marca: 'Caterpillar',    modelo: 'C2.2',      numeroSerie: 'CAT-C22-017',   anoFabrico: 2022, numeroDocumentoVenda: 'FV-2022-017', proximaManut: '2026-02-05', documentos: [], ultimaManutencaoData: '2025-08-05', horasTotaisAcumuladas: 450, horasServicoAcumuladas: 420 },
  // Cliente 10 — Auto São Jorge: equilibrador
  { id: 'm18', clienteNif: '510123456', subcategoriaId: 'sub8', periodicidadeManut: 'semestral',  marca: 'Corghi',        modelo: 'Artiglio 36', numeroSerie: 'COR-A36-018', anoFabrico: 2023, numeroDocumentoVenda: 'FV-2023-018', proximaManut: '2026-02-25', documentos: [], ultimaManutencaoData: '2025-08-25' },
  // Montagens — equipamentos à espera de instalação (m19–m23)
  { id: 'm19', clienteNif: '511234567', subcategoriaId: 'sub2', periodicidadeManut: 'anual',      marca: 'Navel',         modelo: 'EH-2C',      numeroSerie: 'NAV-EH-019',   anoFabrico: 2025, numeroDocumentoVenda: 'FV-2025-019', proximaManut: null, documentos: [], ultimaManutencaoData: null, horasTotaisAcumuladas: null, horasServicoAcumuladas: null },
  { id: 'm20', clienteNif: '513456789', subcategoriaId: 'sub4', periodicidadeManut: 'anual',      marca: 'Navel',         modelo: 'TES-5T',     numeroSerie: 'NAV-TES-020',  anoFabrico: 2025, numeroDocumentoVenda: 'FV-2025-020', proximaManut: null, documentos: [], ultimaManutencaoData: null, horasTotaisAcumuladas: null, horasServicoAcumuladas: null },
  { id: 'm21', clienteNif: '514567890', subcategoriaId: 'sub12', periodicidadeManut: 'anual',     marca: 'Navel',         modelo: 'EH-P4',      numeroSerie: 'NAV-EHP4-021', anoFabrico: 2025, numeroDocumentoVenda: 'FV-2025-021', proximaManut: null, documentos: [], ultimaManutencaoData: null, horasTotaisAcumuladas: null, horasServicoAcumuladas: null },
  { id: 'm22', clienteNif: '515678901', subcategoriaId: 'sub2', periodicidadeManut: 'anual',      marca: 'Navel',         modelo: 'EH-2C',      numeroSerie: 'NAV-EH-022',   anoFabrico: 2025, numeroDocumentoVenda: 'FV-2025-022', proximaManut: null, documentos: [], ultimaManutencaoData: null, horasTotaisAcumuladas: null, horasServicoAcumuladas: null },
  { id: 'm23', clienteNif: '516789012', subcategoriaId: 'sub4', periodicidadeManut: 'anual',      marca: 'Navel',         modelo: 'TES-5T',     numeroSerie: 'NAV-TES-023',  anoFabrico: 2025, numeroDocumentoVenda: 'FV-2025-023', proximaManut: null, documentos: [], ultimaManutencaoData: null, horasTotaisAcumuladas: null, horasServicoAcumuladas: null },
]

// ── MOCK DATA v4 — 28 manutenções: 20 periódicas + 8 montagens (3 concluídas, 2 atraso, 3 próximas) ─
const initialManutencoes = [
  // ── Concluídas (10) — com relatórios completos assinados e emitidos ──
  { id: 'mt01', maquinaId: 'm01', tipo: 'periodica', data: '2025-12-10', tecnico: 'Aurélio Almeida',  status: 'concluida', observacoes: 'Revisão anual. Óleo e filtros substituídos.',    horasTotais: 1340, horasServico: 1265 },
  { id: 'mt02', maquinaId: 'm03', tipo: 'periodica', data: '2026-01-08', tecnico: 'Paulo Medeiros',   status: 'concluida', observacoes: 'Revisão anual. Vedante do cilindro substituído.', horasTotais: 980,  horasServico: 924 },
  { id: 'mt03', maquinaId: 'm05', tipo: 'periodica', data: '2026-01-22', tecnico: 'Aldevino Costa',   status: 'concluida', observacoes: 'Revisão anual. Lubrificação geral efetuada.',    horasTotais: 2250, horasServico: 2110 },
  { id: 'mt04', maquinaId: 'm07', tipo: 'periodica', data: '2026-02-05', tecnico: 'Aurélio Almeida',  status: 'concluida', observacoes: 'Semestral. Calibração e verificação de sensores.' },
  { id: 'mt05', maquinaId: 'm09', tipo: 'periodica', data: '2026-02-12', tecnico: 'Paulo Medeiros',   status: 'concluida', observacoes: 'Revisão anual. Sincronização das 4 colunas OK.',  horasTotais: 1100, horasServico: 1045 },
  { id: 'mt06', maquinaId: 'm02', tipo: 'periodica', data: '2025-10-15', tecnico: 'Paulo Medeiros',   status: 'concluida', observacoes: 'Trimestral. Filtros de ar e óleo substituídos.', horasTotais: 520, horasServico: 488 },
  { id: 'mt07', maquinaId: 'm04', tipo: 'periodica', data: '2026-01-20', tecnico: 'Aldevino Costa',   status: 'concluida', observacoes: 'Semestral. Troca de óleo e filtros. Teste de carga OK.', horasTotais: 830, horasServico: 790 },
  { id: 'mt08', maquinaId: 'm06', tipo: 'periodica', data: '2025-11-01', tecnico: 'Aurélio Almeida',  status: 'concluida', observacoes: 'Trimestral. Verificação de pressão e drenagem de condensado.' },
  { id: 'mt09', maquinaId: 'm08', tipo: 'periodica', data: '2026-02-12', tecnico: 'Paulo Medeiros',   status: 'concluida', observacoes: 'Semestral. Lubrificação dos braços e verificação de fugas.' },
  { id: 'mt10', maquinaId: 'm10', tipo: 'periodica', data: '2025-12-05', tecnico: 'Aldevino Costa',   status: 'concluida', observacoes: 'Revisão anual. Cabos e polias verificados. Sem anomalias.' },
  // ── Em atraso (5) — data anterior a 2026-02-17, pendentes ──
  { id: 'mt11', maquinaId: 'm02', tipo: 'periodica', data: '2026-01-15', tecnico: '',                 status: 'pendente',  observacoes: 'Trimestral em atraso. Aguarda agendamento.' },
  { id: 'mt12', maquinaId: 'm06', tipo: 'periodica', data: '2026-02-01', tecnico: '',                 status: 'pendente',  observacoes: 'Trimestral em atraso. Cliente contactado.' },
  { id: 'mt13', maquinaId: 'm11', tipo: 'periodica', data: '2026-02-10', tecnico: '',                 status: 'pendente',  observacoes: 'Trimestral em atraso. Aguardar peças de filtro.' },
  { id: 'mt14', maquinaId: 'm16', tipo: 'periodica', data: '2026-01-25', tecnico: '',                 status: 'pendente',  observacoes: 'Revisão anual em atraso. Cliente na Graciosa.' },
  { id: 'mt15', maquinaId: 'm17', tipo: 'periodica', data: '2026-02-05', tecnico: '',                 status: 'pendente',  observacoes: 'Semestral em atraso. Gerador nas Flores.' },
  // ── Próximas (5) — datas futuras, agendadas ──
  { id: 'mt16', maquinaId: 'm13', tipo: 'periodica', data: '2026-03-15', tecnico: 'Aldevino Costa',   status: 'agendada',  observacoes: '' },
  { id: 'mt17', maquinaId: 'm15', tipo: 'periodica', data: '2026-04-20', tecnico: 'Paulo Medeiros',   status: 'agendada',  observacoes: '' },
  { id: 'mt18', maquinaId: 'm12', tipo: 'periodica', data: '2026-05-15', tecnico: 'Aurélio Almeida',  status: 'agendada',  observacoes: '' },
  { id: 'mt19', maquinaId: 'm14', tipo: 'periodica', data: '2026-06-10', tecnico: 'Aldevino Costa',   status: 'agendada',  observacoes: '' },
  { id: 'mt20', maquinaId: 'm18', tipo: 'periodica', data: '2026-02-25', tecnico: 'Paulo Medeiros',   status: 'agendada',  observacoes: '' },
  // ── Montagens: 3 concluídas · 2 em atraso · 3 próximas ──
  { id: 'mt21', maquinaId: 'm03', tipo: 'montagem', data: '2020-03-15', tecnico: 'Paulo Medeiros',   status: 'concluida', observacoes: 'Montagem inicial elevador EH-2C. Colunas ancoradas e sistema hidráulico verificado.', horasTotais: 0, horasServico: 0 },
  { id: 'mt22', maquinaId: 'm05', tipo: 'montagem', data: '2019-06-20', tecnico: 'Aldevino Costa',   status: 'concluida', observacoes: 'Montagem inicial elevador de tesoura. Base de cimento conforme plano.', horasTotais: 0, horasServico: 0 },
  { id: 'mt23', maquinaId: 'm09', tipo: 'montagem', data: '2020-04-10', tecnico: 'Paulo Medeiros',   status: 'concluida', observacoes: 'Montagem inicial elevador EH-P4. Sincronização das 4 colunas verificada.', horasTotais: 0, horasServico: 0 },
  { id: 'mt24', maquinaId: 'm19', tipo: 'montagem', data: '2026-01-10', tecnico: '',                 status: 'pendente',  observacoes: 'Montagem em atraso. Equipamento no armazém. Aguarda disponibilidade do cliente.' },
  { id: 'mt25', maquinaId: 'm20', tipo: 'montagem', data: '2026-02-01', tecnico: '',                 status: 'pendente',  observacoes: 'Montagem em atraso. Base de cimento ainda em execução.' },
  { id: 'mt26', maquinaId: 'm21', tipo: 'montagem', data: '2026-03-15', tecnico: 'Paulo Medeiros',   status: 'agendada',  observacoes: '' },
  { id: 'mt27', maquinaId: 'm22', tipo: 'montagem', data: '2026-03-25', tecnico: 'Aldevino Costa',   status: 'agendada',  observacoes: '' },
  { id: 'mt28', maquinaId: 'm23', tipo: 'montagem', data: '2026-04-10', tecnico: 'Aurélio Almeida',  status: 'agendada',  observacoes: '' },
]

// Placeholder base64 1x1 PNG para fotos de demonstração (evita ficheiros grandes)
const FOTO_PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

// ── MOCK DATA v4 — 13 relatórios: 10 periódicas + 3 montagens (checklist ch2m/ch4m/ch12m) ─
const initialRelatorios = [
  // mt01 (m01 sub1) — COM FOTOS
  { id: 'rr01', manutencaoId: 'mt01', numeroRelatorio: '2025.MP.00001', dataCriacao: '2025-12-10T09:15:00.000Z', dataAssinatura: '2025-12-10T11:45:00.000Z', tecnico: 'Aurélio Almeida', nomeAssinante: 'João Bettencourt', assinadoPeloCliente: true, assinaturaDigital: null, checklistRespostas: { ch1:'sim',ch2:'sim',ch3:'sim',ch4:'sim',ch5:'sim',ch6:'sim',ch7:'sim',ch8:'sim',ch9:'sim',ch10:'sim',ch11:'sim',ch12:'sim',ch13:'nao',ch14:'sim',ch14b:'sim' }, notas: 'Bloqueio de segurança com folga excessiva — reaperto efetuado. Restantes pontos em conformidade.', fotos: [FOTO_PLACEHOLDER, FOTO_PLACEHOLDER], ultimoEnvio: '2025-12-10T12:00:00.000Z' },
  // mt02 (m03 sub2) — COM FOTOS
  { id: 'rr02', manutencaoId: 'mt02', numeroRelatorio: '2026.MP.00001', dataCriacao: '2026-01-08T08:30:00.000Z', dataAssinatura: '2026-01-08T10:20:00.000Z', tecnico: 'Paulo Medeiros', nomeAssinante: 'Rui Silveira', assinadoPeloCliente: true, assinaturaDigital: null, checklistRespostas: { ch21:'sim',ch22:'sim',ch23:'sim',ch24:'sim',ch25:'sim',ch26:'sim',ch27:'sim',ch28:'nao',ch29:'sim',ch30:'sim',ch31:'sim',ch32:'sim',ch33:'sim',ch34:'sim',ch34c:'sim',ch34d:'sim',ch34e:'sim',ch34f:'sim',ch34g:'sim',ch34b:'sim' }, notas: 'Válvula limitadora de pressão com desgaste. Substituída em garantia. Sistema estanque após intervenção.', fotos: [FOTO_PLACEHOLDER], ultimoEnvio: '2026-01-08T10:45:00.000Z' },
  // mt03 (m05 sub4) — COM FOTOS
  { id: 'rr03', manutencaoId: 'mt03', numeroRelatorio: '2026.MP.00002', dataCriacao: '2026-01-22T09:00:00.000Z', dataAssinatura: '2026-01-22T12:10:00.000Z', tecnico: 'Aldevino Costa', nomeAssinante: 'Manuel Sousa', assinadoPeloCliente: true, assinaturaDigital: null, checklistRespostas: { ch61:'sim',ch62:'sim',ch63:'sim',ch64:'sim',ch65:'sim',ch66:'sim',ch67:'sim',ch68:'sim',ch69:'sim',ch70:'sim',ch71:'sim',ch72:'sim',ch73:'sim',ch74:'sim',ch74c:'sim',ch74d:'sim',ch74e:'sim',ch74f:'sim',ch74g:'sim',ch74b:'sim' }, notas: 'Revisão anual sem anomalias. Óleo hidráulico substituído. Articulações lubrificadas.', fotos: [FOTO_PLACEHOLDER, FOTO_PLACEHOLDER, FOTO_PLACEHOLDER], ultimoEnvio: '2026-01-22T12:30:00.000Z' },
  // mt04 (m07 sub8) — COM FOTOS
  { id: 'rr04', manutencaoId: 'mt04', numeroRelatorio: '2026.MP.00003', dataCriacao: '2026-02-05T10:00:00.000Z', dataAssinatura: '2026-02-05T13:30:00.000Z', tecnico: 'Aurélio Almeida', nomeAssinante: 'António Sousa', assinadoPeloCliente: true, assinaturaDigital: null, checklistRespostas: { ch801:'sim',ch802:'sim',ch803:'sim',ch804:'sim',ch805:'sim',ch806:'sim',ch807:'sim',ch808:'sim',ch809:'nao',ch810:'sim',ch811:'sim',ch812:'sim',ch813:'sim',ch814:'sim',ch815:'sim' }, notas: 'Calibração de desequilíbrio fora dos parâmetros — recalibrado com roda de referência. Equipamento operacional.', fotos: [FOTO_PLACEHOLDER], ultimoEnvio: '2026-02-05T14:00:00.000Z' },
  // mt05 (m09 sub12) — COM FOTOS
  { id: 'rr05', manutencaoId: 'mt05', numeroRelatorio: '2026.MP.00004', dataCriacao: '2026-02-12T08:45:00.000Z', dataAssinatura: '2026-02-12T11:00:00.000Z', tecnico: 'Paulo Medeiros', nomeAssinante: 'Carlos Melo', assinadoPeloCliente: true, assinaturaDigital: null, checklistRespostas: { ch81:'sim',ch82:'sim',ch83:'sim',ch84:'sim',ch85:'sim',ch86:'sim',ch87:'sim',ch88:'sim',ch89:'sim',ch90:'sim',ch91:'sim',ch92:'sim',ch93:'sim',ch94:'sim',ch94c:'sim',ch94d:'sim',ch94e:'sim',ch94f:'sim',ch94g:'sim',ch94b:'sim' }, notas: 'Revisão anual. Sincronização das 4 colunas verificada e ajustada. Sem fugas no sistema hidráulico.', fotos: [FOTO_PLACEHOLDER, FOTO_PLACEHOLDER], ultimoEnvio: '2026-02-12T11:15:00.000Z' },
  // mt06 (m02 sub5) — SEM FOTOS
  { id: 'rr06', manutencaoId: 'mt06', numeroRelatorio: '2025.MP.00002', dataCriacao: '2025-10-15T09:00:00.000Z', dataAssinatura: '2025-10-15T11:30:00.000Z', tecnico: 'Paulo Medeiros', nomeAssinante: 'João Bettencourt', assinadoPeloCliente: true, assinaturaDigital: null, checklistRespostas: { ch201:'sim',ch202:'sim',ch203:'sim',ch204:'sim',ch205:'sim',ch206:'sim',ch207:'sim',ch208:'sim',ch209:'sim',ch210:'sim',ch211:'sim',ch212:'sim',ch213:'sim',ch214:'sim',ch215:'sim' }, notas: 'Trimestral. Filtros de ar e óleo substituídos. Compressor operacional.', fotos: [], ultimoEnvio: '2025-10-15T11:45:00.000Z' },
  // mt07 (m04 sub7) — SEM FOTOS
  { id: 'rr07', manutencaoId: 'mt07', numeroRelatorio: '2026.MP.00005', dataCriacao: '2026-01-20T08:45:00.000Z', dataAssinatura: '2026-01-20T11:15:00.000Z', tecnico: 'Aldevino Costa', nomeAssinante: 'Rui Silveira', assinadoPeloCliente: true, assinaturaDigital: null, checklistRespostas: { ch701:'sim',ch702:'sim',ch703:'sim',ch704:'sim',ch705:'sim',ch706:'sim',ch707:'sim',ch708:'sim',ch709:'sim',ch710:'sim',ch711:'sim',ch712:'sim',ch713:'sim',ch714:'sim',ch715:'sim' }, notas: 'Semestral. Troca de óleo e filtros. Teste de carga OK. Gerador em bom estado.', fotos: [], ultimoEnvio: '2026-01-20T11:30:00.000Z' },
  // mt08 (m06 sub6) — SEM FOTOS
  { id: 'rr08', manutencaoId: 'mt08', numeroRelatorio: '2025.MP.00003', dataCriacao: '2025-11-01T10:00:00.000Z', dataAssinatura: '2025-11-01T12:20:00.000Z', tecnico: 'Aurélio Almeida', nomeAssinante: 'Manuel Sousa', assinadoPeloCliente: true, assinaturaDigital: null, checklistRespostas: { ch351:'sim',ch352:'sim',ch353:'sim',ch354:'sim',ch355:'sim',ch356:'sim',ch357:'sim',ch358:'sim',ch359:'sim',ch360:'sim',ch361:'sim',ch362:'sim',ch363:'sim',ch364:'sim',ch364b:'sim' }, notas: 'Trimestral. Verificação de pressão e drenagem de condensado. Equipamento conforme.', fotos: [], ultimoEnvio: '2025-11-01T12:35:00.000Z' },
  // mt09 (m08 sub9) — SEM FOTOS
  { id: 'rr09', manutencaoId: 'mt09', numeroRelatorio: '2026.MP.00006', dataCriacao: '2026-02-12T09:15:00.000Z', dataAssinatura: '2026-02-12T11:45:00.000Z', tecnico: 'Paulo Medeiros', nomeAssinante: 'Carlos Melo', assinadoPeloCliente: true, assinaturaDigital: null, checklistRespostas: { ch901:'sim',ch902:'sim',ch903:'sim',ch904:'sim',ch905:'sim',ch906:'sim',ch907:'sim',ch908:'sim',ch909:'sim',ch910:'sim',ch911:'sim',ch912:'sim',ch913:'sim',ch914:'sim',ch915:'sim' }, notas: 'Semestral. Lubrificação dos braços e verificação de fugas. Máquina de trocar pneus operacional.', fotos: [], ultimoEnvio: '2026-02-12T12:00:00.000Z' },
  // mt10 (m10 sub13) — SEM FOTOS
  { id: 'rr10', manutencaoId: 'mt10', numeroRelatorio: '2025.MP.00004', dataCriacao: '2025-12-05T08:30:00.000Z', dataAssinatura: '2025-12-05T11:00:00.000Z', tecnico: 'Aldevino Costa', nomeAssinante: 'Fernando Lopes', assinadoPeloCliente: true, assinaturaDigital: null, checklistRespostas: { ch101:'sim',ch102:'sim',ch103:'sim',ch104:'sim',ch105:'sim',ch106:'sim',ch107:'sim',ch108:'sim',ch109:'sim',ch110:'sim',ch111:'sim',ch112:'sim',ch113:'sim',ch114:'sim',ch114b:'sim' }, notas: 'Revisão anual. Cabos e polias verificados. Sincronização das colunas OK. Sem anomalias.', fotos: [], ultimoEnvio: '2025-12-05T11:20:00.000Z' },
  // ── Montagens (3 relatórios com checklist montagem) ──
  { id: 'rr11', manutencaoId: 'mt21', numeroRelatorio: '2020.MT.00001', dataCriacao: '2020-03-15T09:00:00.000Z', dataAssinatura: '2020-03-15T12:30:00.000Z', tecnico: 'Paulo Medeiros', nomeAssinante: 'Rui Silveira', assinadoPeloCliente: true, assinaturaDigital: null, checklistRespostas: { ch2m01:'sim',ch2m02:'sim',ch2m03:'sim',ch2m04:'sim',ch2m05:'sim',ch2m06:'sim',ch2m07:'sim',ch2m08:'sim',ch2m09:'sim',ch2m10:'sim',ch2m11:'sim',ch2m12:'sim',ch2m13:'sim',ch2m14:'sim',ch2m15:'sim',ch2m16:'sim',ch2m17:'sim',ch2m18:'sim',ch2m19:'sim',ch2m20:'sim' }, notas: 'Montagem inicial elevador EH-2C. Todos os pontos do checklist verificados. Equipamento operacional.', fotos: [FOTO_PLACEHOLDER], ultimoEnvio: '2020-03-15T13:00:00.000Z' },
  { id: 'rr12', manutencaoId: 'mt22', numeroRelatorio: '2019.MT.00001', dataCriacao: '2019-06-20T08:30:00.000Z', dataAssinatura: '2019-06-20T14:00:00.000Z', tecnico: 'Aldevino Costa', nomeAssinante: 'Manuel Sousa', assinadoPeloCliente: true, assinaturaDigital: null, checklistRespostas: { ch4m01:'sim',ch4m02:'sim',ch4m03:'sim',ch4m04:'sim',ch4m05:'sim',ch4m06:'sim',ch4m07:'sim',ch4m08:'sim',ch4m09:'sim',ch4m10:'sim',ch4m11:'sim',ch4m12:'sim',ch4m13:'sim',ch4m14:'sim',ch4m15:'sim',ch4m16:'sim',ch4m17:'sim',ch4m18:'sim',ch4m19:'sim',ch4m20:'sim' }, notas: 'Montagem inicial elevador de tesoura. Base de cimento conforme plano. Sincronização das plataformas OK.', fotos: [FOTO_PLACEHOLDER, FOTO_PLACEHOLDER], ultimoEnvio: '2019-06-20T14:30:00.000Z' },
  { id: 'rr13', manutencaoId: 'mt23', numeroRelatorio: '2020.MT.00002', dataCriacao: '2020-04-10T09:15:00.000Z', dataAssinatura: '2020-04-10T15:45:00.000Z', tecnico: 'Paulo Medeiros', nomeAssinante: 'Carlos Melo', assinadoPeloCliente: true, assinaturaDigital: null, checklistRespostas: { ch12m01:'sim',ch12m02:'sim',ch12m03:'sim',ch12m04:'sim',ch12m05:'sim',ch12m06:'sim',ch12m07:'sim',ch12m08:'sim',ch12m09:'sim',ch12m10:'sim',ch12m11:'sim',ch12m12:'sim',ch12m13:'sim',ch12m14:'sim',ch12m15:'sim',ch12m16:'sim',ch12m17:'sim',ch12m18:'sim',ch12m19:'sim',ch12m20:'sim' }, notas: 'Montagem inicial elevador EH-P4. Sincronização das 4 colunas verificada. Equipamento pronto para utilização.', fotos: [], ultimoEnvio: '2020-04-10T16:00:00.000Z' },
]

export function DataProvider({ children }) {
  // ── Estado global ──────────────────────────────────────────────────────────
  const [clientes,      setClientes]      = useState([])
  const [categorias,    setCategorias]    = useState([])
  const [subcategorias, setSubcategorias] = useState([])
  const [checklistItems,setChecklistItems]= useState([])
  const [maquinas,      setMaquinas]      = useState([])
  const [manutencoes,   setManutencoes]   = useState([])
  const [relatorios,    setRelatorios]    = useState([])
  const [pecasPlano,    setPecasPlano]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('atm_pecas_plano') ?? '[]') } catch { return [] }
  })
  const [loading,       setLoading]       = useState(true)

  // ── Estado de conectividade e sincronização ────────────────────────────────
  const [isOnline,     setIsOnline]     = useState(navigator.onLine)
  const [syncPending,  setSyncPending]  = useState(() => queueSize())
  const [isSyncing,    setIsSyncing]    = useState(false)

  // ── Fetch inicial e re-fetch ao recuperar o foco da janela ────────────────
  const fetchTodos = useCallback(async () => {
    const { isTokenValid, fetchTodosOsDados } = await import('../services/apiService')
    if (!isTokenValid()) { setLoading(false); return }
    try {
      const d = await fetchTodosOsDados()
      setClientes(d.clientes           ?? [])
      setCategorias(d.categorias       ?? [])
      setSubcategorias(d.subcategorias ?? [])
      setChecklistItems(d.checklistItems ?? [])
      setMaquinas(d.maquinas           ?? [])
      setManutencoes(d.manutencoes     ?? [])
      setRelatorios(d.relatorios       ?? [])
      // Guardar snapshot no cache para uso offline
      saveCache(d)
      logger.info('DataContext', 'fetchTodos', 'Dados carregados com sucesso', {
        clientes: (d.clientes ?? []).length,
        maquinas: (d.maquinas ?? []).length,
        manutencoes: (d.manutencoes ?? []).length,
      })
    } catch (err) {
      const isNetErr = !err.status
      if (isNetErr) {
        // Sem ligação — tentar cache local
        const cache = loadCache()
        if (cache?.data) {
          const d = cache.data
          setClientes(d.clientes           ?? [])
          setCategorias(d.categorias       ?? [])
          setSubcategorias(d.subcategorias ?? [])
          setChecklistItems(d.checklistItems ?? [])
          setMaquinas(d.maquinas           ?? [])
          setManutencoes(d.manutencoes     ?? [])
          setRelatorios(d.relatorios       ?? [])
          logger.info('DataContext', 'fetchTodos', 'Dados carregados do cache local (offline)', {
            cacheAge: Math.round((Date.now() - cache.ts) / 60000) + ' min',
          })
        } else {
          logger.warn('DataContext', 'fetchTodos', 'Offline e sem cache local — sem dados disponíveis')
        }
      } else {
        logger.error('DataContext', 'fetchTodos', err.message || 'Falha ao carregar dados', { stack: err.stack?.slice(0, 400) })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Processar fila de sync e actualizar dados quando volta online ─────────
  const processSync = useCallback(async () => {
    const { isTokenValid, apiCall } = await import('../services/apiService')
    if (!navigator.onLine || !isTokenValid()) return { processed: 0, failed: 0 }
    setIsSyncing(true)
    try {
      const result = await processQueue((resource, action, opts) => apiCall(resource, action, opts))
      setSyncPending(queueSize())
      if (result.processed > 0) {
        await fetchTodos()
        logger.action('DataContext', 'processSync',
          `${result.processed} operação(ões) sincronizadas com o servidor`, result)
      }
      if (result.failed > 0) {
        logger.warn('DataContext', 'processSync',
          `${result.failed} operação(ões) rejeitadas pelo servidor (removidas da fila)`, result)
      }
      return result
    } catch (err) {
      logger.error('DataContext', 'processSync', err.message || 'Erro ao sincronizar', { stack: err.stack?.slice(0, 300) })
      return { processed: 0, failed: 0 }
    } finally {
      setIsSyncing(false)
    }
  }, [fetchTodos])

  useEffect(() => {
    fetchTodos()
    const handleFocus = () => fetchTodos()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchTodos])

  // ── Listeners: online/offline + evento de login ───────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      // Ao voltar online: processar fila pendente e refrescar dados
      await processSync()
    }
    const handleOffline = () => setIsOnline(false)
    // Disparado pelo AuthContext após login bem-sucedido
    const handleLogin = async () => {
      await processSync()
      await fetchTodos()
    }
    window.addEventListener('online',    handleOnline)
    window.addEventListener('offline',   handleOffline)
    window.addEventListener('atm:login', handleLogin)
    return () => {
      window.removeEventListener('online',    handleOnline)
      window.removeEventListener('offline',   handleOffline)
      window.removeEventListener('atm:login', handleLogin)
    }
  }, [processSync, fetchTodos])

  const getSubcategoria = useCallback((id) => subcategorias.find(s => s.id === id), [subcategorias])
  const getCategoria = useCallback((id) => categorias.find(c => c.id === id), [categorias])
  const getSubcategoriasByCategoria = useCallback((categoriaId) =>
    subcategorias.filter(s => s.categoriaId === categoriaId).sort((a, b) => a.nome.localeCompare(b.nome)),
  [subcategorias])
  const getChecklistBySubcategoria = useCallback((subcategoriaId, tipo = 'periodica') =>
    checklistItems
      .filter(c => c.subcategoriaId === subcategoriaId && (c.tipo || 'periodica') === tipo)
      .sort((a, b) => a.ordem - b.ordem),
  [checklistItems])

  const getIntervaloDias = useCallback((categoriaId) => {
    const cat = categorias.find(c => c.id === categoriaId)
    return cat ? INTERVALOS[cat.intervaloTipo]?.dias ?? 90 : 90
  }, [categorias])

  const getIntervaloDiasBySubcategoria = useCallback((subcategoriaId) => {
    const sub = subcategorias.find(s => s.id === subcategoriaId)
    return sub ? getIntervaloDias(sub.categoriaId) : 90
  }, [subcategorias, getIntervaloDias])

  const getIntervaloDiasByMaquina = useCallback((maquina) => {
    if (maquina?.periodicidadeManut && INTERVALOS[maquina.periodicidadeManut]) {
      return INTERVALOS[maquina.periodicidadeManut].dias
    }
    return getIntervaloDiasBySubcategoria(maquina?.subcategoriaId)
  }, [getIntervaloDiasBySubcategoria])

  // ── Helper: chama API em background; se offline, enfileira para sync ────────
  // Assinatura: persist(apiFn, queueDescriptor, rollback?)
  //   apiFn          — função async que chama a API
  //   queueDescriptor — { resource, action, id?, data? } — para enfileirar offline
  //   rollback        — função chamada em erro de servidor (não em erro de rede)
  const persist = useCallback(async (apiFn, queueDescriptor, rollback) => {
    const offline = !navigator.onLine

    if (offline) {
      // Offline: enfileirar operação para sync posterior
      if (queueDescriptor) {
        const result = enqueue(queueDescriptor)
        if (result.ok) {
          setSyncPending(prev => prev + 1)
          logger.info('DataContext', 'persist',
            `Operação enfileirada offline (${queueDescriptor.resource}/${queueDescriptor.action})`)
        } else {
          logger.warn('DataContext', 'persist',
            `Fila offline cheia — operação ${queueDescriptor.resource}/${queueDescriptor.action} não guardada`)
          if (rollback) rollback()
        }
      }
      return
    }

    try {
      await apiFn()
    } catch (err) {
      const isNetErr = !err.status // erros de rede não têm status HTTP
      if (isNetErr && queueDescriptor) {
        // Perdeu ligação durante a chamada — enfileirar
        const result = enqueue(queueDescriptor)
        if (result.ok) {
          setSyncPending(prev => prev + 1)
          setIsOnline(false)
        } else if (rollback) {
          rollback()
        }
      } else {
        logger.error('DataContext', 'persist', err.message || 'Falha ao guardar dados', { stack: err.stack?.slice(0, 400) })
        if (rollback) rollback()
      }
    }
  }, [])

  // ── Subcategorias ─────────────────────────────────────────────────────────
  const addSubcategoria = useCallback((s) => {
    const id = 'sub' + Date.now()
    const novo = { ...s, id }
    setSubcategorias(prev => [...prev, novo])
    import('../services/apiService').then(({ apiSubcategorias }) =>
      persist(() => apiSubcategorias.create(novo),
              { resource: 'subcategorias', action: 'create', data: novo })
    )
    return id
  }, [persist])

  const updateSubcategoria = useCallback((id, data) => {
    setSubcategorias(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
    import('../services/apiService').then(({ apiSubcategorias }) =>
      persist(() => apiSubcategorias.update(id, data),
              { resource: 'subcategorias', action: 'update', id, data })
    )
  }, [persist])

  const removeSubcategoria = useCallback((id) => {
    if (maquinas.some(m => m.subcategoriaId === id)) return false
    setSubcategorias(prev => prev.filter(s => s.id !== id))
    setChecklistItems(prev => prev.filter(c => c.subcategoriaId !== id))
    import('../services/apiService').then(({ apiSubcategorias }) =>
      persist(() => apiSubcategorias.remove(id),
              { resource: 'subcategorias', action: 'delete', id })
    )
    return true
  }, [maquinas, persist])

  // ── Checklist ─────────────────────────────────────────────────────────────
  const addChecklistItem = useCallback((item) => {
    const id = 'ch' + Date.now()
    const novo = { ...item, id }
    setChecklistItems(prev => [...prev, novo])
    import('../services/apiService').then(({ apiChecklistItems }) =>
      persist(() => apiChecklistItems.create(novo),
              { resource: 'checklistItems', action: 'create', data: novo })
    )
    return id
  }, [persist])

  const updateChecklistItem = useCallback((id, data) => {
    setChecklistItems(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    import('../services/apiService').then(({ apiChecklistItems }) =>
      persist(() => apiChecklistItems.update(id, data),
              { resource: 'checklistItems', action: 'update', id, data })
    )
  }, [persist])

  const removeChecklistItem = useCallback((id) => {
    setChecklistItems(prev => prev.filter(c => c.id !== id))
    import('../services/apiService').then(({ apiChecklistItems }) =>
      persist(() => apiChecklistItems.remove(id),
              { resource: 'checklistItems', action: 'delete', id })
    )
  }, [persist])

  // ── Clientes ──────────────────────────────────────────────────────────────
  const addCliente = useCallback((c) => {
    const nif = String(c.nif).trim()
    if (clientes.some(cli => cli.nif === nif)) return null
    const id = 'cli' + Date.now()
    const novo = { ...c, id, nif }
    setClientes(prev => [...prev, novo])
    logger.action('DataContext', 'addCliente', `Cliente "${c.nome || '—'}" adicionado`, { nif })
    import('../services/apiService').then(({ apiClientes }) =>
      persist(() => apiClientes.create(novo),
              { resource: 'clientes', action: 'create', data: novo })
    )
    return nif
  }, [clientes, persist])

  const updateCliente = useCallback((nif, data) => {
    setClientes(prev => prev.map(c => c.nif === nif ? { ...c, ...data } : c))
    const cli = clientes.find(c => c.nif === nif)
    if (cli) {
      const merged = { ...cli, ...data }
      const recId  = cli.id ?? nif
      import('../services/apiService').then(({ apiClientes }) =>
        persist(() => apiClientes.update(recId, merged),
                { resource: 'clientes', action: 'update', id: recId, data: merged })
      )
    }
  }, [clientes, persist])

  const removeCliente = useCallback((nif) => {
    const cli = clientes.find(c => c.nif === nif)
    logger.action('DataContext', 'removeCliente', `Cliente "${cli?.nome || nif}" eliminado`, { nif })
    const maqIds   = maquinas.filter(m => m.clienteNif === nif || m.clienteId === nif).map(m => m.id)
    const manutIds = manutencoes.filter(m => maqIds.includes(m.maquinaId)).map(m => m.id)
    setClientes(prev => prev.filter(c => c.nif !== nif))
    setMaquinas(prev => prev.filter(m => m.clienteNif !== nif && m.clienteId !== nif))
    setManutencoes(prev => prev.filter(m => !maqIds.includes(m.maquinaId)))
    setRelatorios(prev => prev.filter(r => !manutIds.includes(r.manutencaoId)))
    if (cli) {
      const recId = cli.id ?? nif
      import('../services/apiService').then(({ apiClientes }) =>
        persist(() => apiClientes.remove(recId),
                { resource: 'clientes', action: 'delete', id: recId })
      )
    }
  }, [clientes, maquinas, manutencoes, persist])

  // ── Categorias ────────────────────────────────────────────────────────────
  const addCategoria = useCallback((c) => {
    const id = 'cat' + Date.now()
    const novo = { ...c, id }
    setCategorias(prev => [...prev, novo])
    import('../services/apiService').then(({ apiCategorias }) =>
      persist(() => apiCategorias.create(novo),
              { resource: 'categorias', action: 'create', data: novo })
    )
    return id
  }, [persist])

  const updateCategoria = useCallback((id, data) => {
    setCategorias(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    import('../services/apiService').then(({ apiCategorias }) =>
      persist(() => apiCategorias.update(id, data),
              { resource: 'categorias', action: 'update', id, data })
    )
  }, [persist])

  const removeCategoria = useCallback((id) => {
    if (subcategorias.some(s => s.categoriaId === id)) return false
    setCategorias(prev => prev.filter(c => c.id !== id))
    import('../services/apiService').then(({ apiCategorias }) =>
      persist(() => apiCategorias.remove(id),
              { resource: 'categorias', action: 'delete', id })
    )
    return true
  }, [subcategorias, persist])

  // ── Máquinas ──────────────────────────────────────────────────────────────
  const addMaquina = useCallback((m) => {
    const id = String(Date.now())
    const { clienteId, ...rest } = m
    const novo = { ...rest, id, clienteId: m.clienteId ?? m.clienteNif, clienteNif: m.clienteNif ?? clienteId, documentos: m.documentos ?? [] }
    setMaquinas(prev => [...prev, novo])
    logger.action('DataContext', 'addMaquina', `Equipamento "${m.marca} ${m.modelo || ''}" adicionado`, { id, clienteNif: novo.clienteNif })
    import('../services/apiService').then(({ apiMaquinas }) =>
      persist(() => apiMaquinas.create(novo),
              { resource: 'maquinas', action: 'create', data: novo })
    )
    return id
  }, [persist])

  const addDocumentoMaquina = useCallback((maquinaId, doc) => {
    const id = 'doc' + Date.now()
    let maqAtual
    setMaquinas(prev => prev.map(m => {
      if (m.id !== maquinaId) return m
      maqAtual = { ...m, documentos: [...(m.documentos ?? []), { ...doc, id }] }
      return maqAtual
    }))
    if (maqAtual) {
      import('../services/apiService').then(({ apiMaquinas }) =>
        persist(() => apiMaquinas.update(maquinaId, maqAtual),
                { resource: 'maquinas', action: 'update', id: maquinaId, data: maqAtual })
      )
    }
    return id
  }, [persist])

  const removeDocumentoMaquina = useCallback((maquinaId, docId) => {
    let maqAtual
    setMaquinas(prev => prev.map(m => {
      if (m.id !== maquinaId) return m
      maqAtual = { ...m, documentos: (m.documentos ?? []).filter(d => d.id !== docId) }
      return maqAtual
    }))
    if (maqAtual) {
      import('../services/apiService').then(({ apiMaquinas }) =>
        persist(() => apiMaquinas.update(maquinaId, maqAtual),
                { resource: 'maquinas', action: 'update', id: maquinaId, data: maqAtual })
      )
    }
  }, [persist])

  const updateMaquina = useCallback((id, data) => {
    setMaquinas(prev => prev.map(m => m.id === id ? { ...m, ...data } : m))
    import('../services/apiService').then(({ apiMaquinas }) =>
      persist(() => apiMaquinas.update(id, data),
              { resource: 'maquinas', action: 'update', id, data })
    )
  }, [persist])

  const removeMaquina = useCallback((id) => {
    const maqManutIds = manutencoes.filter(m => m.maquinaId === id).map(m => m.id)
    setMaquinas(prev => prev.filter(m => m.id !== id))
    setManutencoes(prev => prev.filter(m => m.maquinaId !== id))
    setRelatorios(prev => prev.filter(r => !maqManutIds.includes(r.manutencaoId)))
    setPecasPlano(prev => prev.filter(p => p.maquinaId !== id))
    import('../services/apiService').then(({ apiMaquinas }) =>
      persist(() => apiMaquinas.remove(id),
              { resource: 'maquinas', action: 'delete', id })
    )
  }, [manutencoes, persist])

  // ── Manutenções ───────────────────────────────────────────────────────────
  const addManutencao = useCallback((m) => {
    const id = 'm' + Date.now()
    const novo = { ...m, id }
    setManutencoes(prev => [...prev, novo])
    logger.action('DataContext', 'addManutencao', `Manutenção agendada (maquinaId: ${m.maquinaId})`, { id, maquinaId: m.maquinaId, data: m.data })
    import('../services/apiService').then(({ apiManutencoes }) =>
      persist(() => apiManutencoes.create(novo),
              { resource: 'manutencoes', action: 'create', data: novo })
    )
    return id
  }, [persist])

  const updateManutencao = useCallback((id, data) => {
    setManutencoes(prev => prev.map(m => m.id === id ? { ...m, ...data } : m))
    import('../services/apiService').then(({ apiManutencoes }) =>
      persist(() => apiManutencoes.update(id, data),
              { resource: 'manutencoes', action: 'update', id, data })
    )
  }, [persist])

  const removeManutencao = useCallback((id) => {
    setManutencoes(prev => prev.filter(m => m.id !== id))
    setRelatorios(prev => prev.filter(r => r.manutencaoId !== id))
    import('../services/apiService').then(({ apiManutencoes }) =>
      persist(() => apiManutencoes.remove(id),
              { resource: 'manutencoes', action: 'delete', id })
    )
  }, [persist])

  // ── Relatórios ────────────────────────────────────────────────────────────
  const addRelatorio = useCallback((r) => {
    const id = 'r' + Date.now()
    const dataCriacao = r.dataCriacao ?? new Date().toISOString()

    // Número de relatório gerado client-side para resposta imediata.
    // O servidor aceita o número proposto; a constraint UNIQUE protege contra colisões.
    let numeroRelatorio = r.numeroRelatorio
    if (!numeroRelatorio) {
      const ano = new Date().getFullYear()
      const tipoManut = manutencoes.find(m => m.id === r.manutencaoId)?.tipo ?? 'periodica'
      const prefix = tipoManut === 'montagem' ? 'MT' : 'MP'
      const pattern = `${ano}.${prefix}.`
      const existingNums = relatorios
        .map(rel => rel.numeroRelatorio)
        .filter(n => typeof n === 'string' && n.startsWith(pattern))
        .map(n => parseInt(n.split('.')[2] ?? '0', 10))
        .filter(n => !isNaN(n))
      const next = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1
      numeroRelatorio = `${ano}.${prefix}.${String(next).padStart(5, '0')}`
    }

    const novo = { ...r, id, dataCriacao, numeroRelatorio, assinadoPeloCliente: r.assinadoPeloCliente ?? false }
    setRelatorios(prev => [...prev, novo])
    import('../services/apiService').then(({ apiRelatorios }) =>
      persist(() => apiRelatorios.create(novo),
              { resource: 'relatorios', action: 'create', data: novo })
    )
    return { id, numeroRelatorio }
  }, [manutencoes, relatorios, persist])

  const updateRelatorio = useCallback((id, data) => {
    setRelatorios(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    import('../services/apiService').then(({ apiRelatorios }) =>
      persist(() => apiRelatorios.update(id, data),
              { resource: 'relatorios', action: 'update', id, data })
    )
  }, [persist])

  /**
   * PASSO 1 — Calcula as datas periódicas, evitando fins de semana e feriados PT/Açores,
   * e detecta conflitos com manutenções já agendadas na mesma data.
   *
   * Não modifica o estado; devolve os registos propostos e a lista de conflitos para
   * revisão pelo utilizador antes de confirmar.
   *
   * @param {object} manutencaoMontagem — { maquinaId, periodicidade, data, tecnico }
   * @returns {{ novas: object[], conflitos: Array<{index:number, data:string, existentes:number}> }}
   */
  const prepararManutencoesPeriodicas = useCallback((manutencaoMontagem) => {
    const { maquinaId, periodicidade, data: dataBase, tecnico } = manutencaoMontagem
    const intervaloDias = INTERVALOS[periodicidade]?.dias ?? 365
    const dataBaseMs    = new Date(dataBase).getTime()
    const limiteMs      = dataBaseMs + 3 * 365.25 * 24 * 3600 * 1000

    // Feriados para todo o período
    const anoInicio = new Date(dataBase).getFullYear()
    const anoFim    = new Date(limiteMs).getFullYear()
    const feriadosSet = buildFeriadosSet(anoInicio, anoFim)

    // Dias já ocupados por manutenções existentes (agendadas ou pendentes)
    const diasOcupados = new Set(
      manutencoes
        .filter(m => m.status === 'agendada' || m.status === 'pendente')
        .map(m => m.data)
    )

    const base  = Date.now()
    const novas = []
    const conflitos = []
    let d = new Date(dataBase + 'T12:00:00')

    while (true) {
      d = new Date(d.getTime() + intervaloDias * 24 * 3600 * 1000)
      if (d.getTime() > limiteMs) break

      // Ajusta para dia útil (evita fins de semana e feriados)
      const { data: dAjustada, conflito } = encontrarDiaLivre(d, feriadosSet, diasOcupados)
      const iso = `${dAjustada.getFullYear()}-${String(dAjustada.getMonth() + 1).padStart(2, '0')}-${String(dAjustada.getDate()).padStart(2, '0')}`

      const idx = novas.length
      novas.push({
        id: `mp${base}_${idx + 1}`,
        maquinaId,
        tipo: 'periodica',
        periodicidade,
        data: iso,
        tecnico: tecnico || '',
        status: 'agendada',
        observacoes: 'Agendamento automático pós-montagem.',
      })

      if (conflito) {
        const existentes = manutencoes.filter(m =>
          (m.status === 'agendada' || m.status === 'pendente') && m.data === iso
        ).length
        conflitos.push({ index: idx, data: iso, existentes })
      }

      // Marcar o dia como ocupado para evitar que futuras iterações colidam entre si
      diasOcupados.add(iso)
    }

    return { novas, conflitos }
  }, [manutencoes])

  /**
   * PASSO 2 — Persiste no estado o array de manutenções já preparado (e eventualmente
   * ajustado pelo utilizador na resolução de conflitos).
   *
   * @param {object[]} novas — array devolvido por prepararManutencoesPeriodicas (eventualmente modificado)
   * @returns {number} — número de manutenções criadas
   */
  const confirmarManutencoesPeriodicas = useCallback((novas) => {
    if (!novas?.length) return 0
    setManutencoes(prev => [...prev, ...novas])
    import('../services/apiService').then(({ apiManutencoes }) =>
      persist(() => apiManutencoes.bulkCreate(novas),
              { resource: 'manutencoes', action: 'bulk_create', data: novas })
    )
    return novas.length
  }, [persist])

  const getRelatorioByManutencao = useCallback((manutencaoId) => {
    return relatorios.find(r => r.manutencaoId === manutencaoId)
  }, [relatorios])

  /**
   * Bloco B — Recalcular manutenções periódicas futuras após execução de uma periódica.
   *
   * Faz tudo atomicamente dentro do setManutencoes:
   *  1. Remove as futuras pendentes/agendadas da máquina (posterior à data de execução)
   *  2. Gera novas a partir da data de execução real, para 3 anos
   *
   * @returns {number} número de novas manutenções criadas
   */
  const recalcularPeriodicasAposExecucao = useCallback((maquinaId, periodicidade, dataExecucao, tecnico) => {
    if (!periodicidade || !INTERVALOS[periodicidade]) return 0

    const intervaloDias = INTERVALOS[periodicidade].dias
    const dataBaseMs    = new Date(dataExecucao + 'T12:00:00').getTime()
    const limiteMs      = dataBaseMs + 3 * 365.25 * 24 * 3600 * 1000
    const anoInicio     = new Date(dataExecucao).getFullYear()
    const anoFim        = new Date(limiteMs).getFullYear()
    const feriadosSet   = buildFeriadosSet(anoInicio, anoFim)

    let novaCount = 0

    setManutencoes(prev => {
      // 1. Mantém apenas as manutenções que NÃO são futuras pendentes/agendadas desta máquina
      const semFuturas = prev.filter(m =>
        !(m.maquinaId === maquinaId &&
          (m.status === 'pendente' || m.status === 'agendada') &&
          m.data > dataExecucao)
      )

      // 2. Dias já ocupados (sem as removidas)
      const diasOcupados = new Set(
        semFuturas
          .filter(m => m.status === 'agendada' || m.status === 'pendente')
          .map(m => m.data)
      )

      // 3. Gerar novas manutenções
      const base  = Date.now()
      const novas = []
      let d = new Date(dataExecucao + 'T12:00:00')

      while (true) {
        d = new Date(d.getTime() + intervaloDias * 24 * 3600 * 1000)
        if (d.getTime() > limiteMs) break
        const { data: dAjustada } = encontrarDiaLivre(d, feriadosSet, diasOcupados)
        const iso = [
          dAjustada.getFullYear(),
          String(dAjustada.getMonth() + 1).padStart(2, '0'),
          String(dAjustada.getDate()).padStart(2, '0'),
        ].join('-')
        novas.push({
          id:           `mp${base}_${novas.length + 1}`,
          maquinaId,
          tipo:         'periodica',
          periodicidade,
          data:         iso,
          tecnico:      tecnico || '',
          status:       'agendada',
          observacoes:  'Reagendamento automático pós-execução periódica.',
        })
        diasOcupados.add(iso)
      }

      novaCount = novas.length

      if (novas.length > 0) {
        import('../services/apiService').then(({ apiManutencoes }) =>
          persist(() => apiManutencoes.bulkCreate(novas),
                  { resource: 'manutencoes', action: 'recalc_periodicas', data: novas })
        )
      }

      return [...semFuturas, ...novas]
    })

    return novaCount
  }, [persist])

  // ── Persistência local de pecasPlano ─────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('atm_pecas_plano', JSON.stringify(pecasPlano))
  }, [pecasPlano])

  // ── Peças e consumíveis — plano por máquina ───────────────────────────────────
  const addPecaPlano = useCallback((peca) => {
    const id = 'pp' + Date.now()
    const nova = { ...peca, id }
    setPecasPlano(prev => [...prev, nova])
    return id
  }, [])

  const addPecasPlanoLote = useCallback((pecas) => {
    const novas = pecas.map((p, i) => ({ ...p, id: 'pp' + (Date.now() + i) }))
    setPecasPlano(prev => [...prev, ...novas])
    return novas.map(p => p.id)
  }, [])

  const updatePecaPlano = useCallback((id, data) => {
    setPecasPlano(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
  }, [])

  const removePecaPlano = useCallback((id) => {
    setPecasPlano(prev => prev.filter(p => p.id !== id))
  }, [])

  const removePecasPlanoByMaquina = useCallback((maquinaId) => {
    setPecasPlano(prev => prev.filter(p => p.maquinaId !== maquinaId))
  }, [])

  const getPecasPlanoByMaquina = useCallback((maquinaId, tipoManut = null) => {
    return pecasPlano
      .filter(p => p.maquinaId === maquinaId && (tipoManut === null || p.tipoManut === tipoManut))
      .sort((a, b) => (a.posicao ?? '').localeCompare(b.posicao ?? ''))
  }, [pecasPlano])

  // ── Ordens de trabalho — iniciar manutenção ───────────────────────────────────
  const iniciarManutencao = useCallback((id) => {
    const inicioExecucao = new Date().toISOString()
    updateManutencao(id, { status: 'em_progresso', inicioExecucao })
    logger.action('DataContext', 'iniciarManutencao', `Manutenção ${id} iniciada`, { inicioExecucao })
  }, [updateManutencao])

  // ── Backup / Restore ──────────────────────────────────────────────────────────

  /**
   * Exporta todos os dados da aplicação como ficheiro JSON para download.
   * As fotos (base64) estão incluídas — o ficheiro pode ser grande.
   */
  const exportarDados = useCallback(() => {
    const backup = {
      versao:      '1.3.0',
      exportadoEm: new Date().toISOString(),
      dados: {
        clientes,
        categorias,
        subcategorias,
        checklistItems,
        maquinas,
        manutencoes,
        relatorios,
      },
    }
    const json = JSON.stringify(backup, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const ts   = new Date().toISOString().slice(0, 10)
    a.href     = url
    a.download = `atmanut_backup_${ts}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [clientes, categorias, subcategorias, checklistItems, maquinas, manutencoes, relatorios])

  /**
   * Restaura dados a partir de um objecto de backup.
   * Actualiza o estado React E persiste no servidor via bulk_restore.
   */
  const restaurarDados = useCallback(async (backup) => {
    try {
      const d = backup?.dados
      if (!d) return { ok: false, message: 'Ficheiro inválido: campo "dados" em falta.' }

      // Actualiza estado local imediatamente
      if (Array.isArray(d.clientes))       setClientes(d.clientes)
      if (Array.isArray(d.categorias))     setCategorias(d.categorias)
      if (Array.isArray(d.subcategorias))  setSubcategorias(d.subcategorias)
      if (Array.isArray(d.checklistItems)) setChecklistItems(d.checklistItems)
      if (Array.isArray(d.maquinas))       setMaquinas(d.maquinas)
      if (Array.isArray(d.manutencoes))    setManutencoes(d.manutencoes)
      if (Array.isArray(d.relatorios))     setRelatorios(d.relatorios)

      // Persiste no servidor (substitui todos os dados)
      const {
        apiClientes, apiCategorias, apiSubcategorias, apiChecklistItems,
        apiMaquinas, apiManutencoes, apiRelatorios,
      } = await import('../services/apiService')

      await Promise.all([
        d.clientes       ? apiClientes.bulkRestore(d.clientes)            : Promise.resolve(),
        d.categorias     ? apiCategorias.bulkRestore(d.categorias)        : Promise.resolve(),
        d.subcategorias  ? apiSubcategorias.bulkRestore(d.subcategorias)  : Promise.resolve(),
        d.checklistItems ? apiChecklistItems.bulkRestore(d.checklistItems): Promise.resolve(),
        d.maquinas       ? apiMaquinas.bulkRestore(d.maquinas)            : Promise.resolve(),
        d.manutencoes    ? apiManutencoes.bulkRestore(d.manutencoes)      : Promise.resolve(),
        d.relatorios     ? apiRelatorios.bulkRestore(d.relatorios)        : Promise.resolve(),
      ])

      const dtBackup = backup.exportadoEm ? new Date(backup.exportadoEm).toLocaleString('pt-PT', { timeZone: 'Atlantic/Azores' }) : '—'
      return { ok: true, message: `Dados restaurados com sucesso (backup de ${dtBackup}).` }
    } catch (err) {
      logger.error('DataContext', 'restaurarDados', `Erro ao restaurar backup: ${err.message}`, { stack: err.stack?.slice(0, 300) })
      return { ok: false, message: `Erro ao restaurar: ${err.message}` }
    }
  }, [])

  const value = useMemo(() => ({
    loading,
    refreshData: fetchTodos,
    isOnline,
    syncPending,
    isSyncing,
    processSync,
    INTERVALOS,
    categorias,
    subcategorias,
    checklistItems,
    clientes,
    maquinas,
    manutencoes,
    relatorios,
    pecasPlano,
    getIntervaloDias,
    getIntervaloDiasBySubcategoria,
    getIntervaloDiasByMaquina,
    getSubcategoria,
    getCategoria,
    getSubcategoriasByCategoria,
    getChecklistBySubcategoria,
    addSubcategoria,
    updateSubcategoria,
    removeSubcategoria,
    addChecklistItem,
    updateChecklistItem,
    removeChecklistItem,
    addCategoria,
    updateCategoria,
    removeCategoria,
    addCliente,
    updateCliente,
    removeCliente,
    addMaquina,
    updateMaquina,
    removeMaquina,
    addDocumentoMaquina,
    removeDocumentoMaquina,
    addManutencao,
    updateManutencao,
    removeManutencao,
    iniciarManutencao,
    addRelatorio,
    updateRelatorio,
    getRelatorioByManutencao,
    prepararManutencoesPeriodicas,
    confirmarManutencoesPeriodicas,
    recalcularPeriodicasAposExecucao,
    addPecaPlano,
    addPecasPlanoLote,
    updatePecaPlano,
    removePecaPlano,
    removePecasPlanoByMaquina,
    getPecasPlanoByMaquina,
    exportarDados,
    restaurarDados,
  }), [
    INTERVALOS, categorias, subcategorias, checklistItems, clientes, maquinas, manutencoes, relatorios, pecasPlano,
    getIntervaloDias, getIntervaloDiasBySubcategoria, getIntervaloDiasByMaquina,
    getSubcategoria, getCategoria, getSubcategoriasByCategoria, getChecklistBySubcategoria,
    addSubcategoria, updateSubcategoria, removeSubcategoria,
    addChecklistItem, updateChecklistItem, removeChecklistItem,
    addCategoria, updateCategoria, removeCategoria,
    addCliente, updateCliente, removeCliente,
    addMaquina, updateMaquina, removeMaquina, addDocumentoMaquina, removeDocumentoMaquina,
    addManutencao, updateManutencao, removeManutencao, iniciarManutencao,
    addRelatorio, updateRelatorio, getRelatorioByManutencao,
    prepararManutencoesPeriodicas, confirmarManutencoesPeriodicas, recalcularPeriodicasAposExecucao,
    addPecaPlano, addPecasPlanoLote, updatePecaPlano, removePecaPlano, removePecasPlanoByMaquina, getPecasPlanoByMaquina,
    exportarDados, restaurarDados,
    loading, fetchTodos,
    isOnline, syncPending, isSyncing, processSync,
  ])

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData deve ser usado dentro de DataProvider')
  return ctx
}
