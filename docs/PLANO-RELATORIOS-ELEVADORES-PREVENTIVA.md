# Plano — Relatórios de manutenção preventiva de elevadores

Fonte da intenção: [`docs/NAVEL_reflexao_melhoria_relatorios_Cursor.md`](NAVEL_reflexao_melhoria_relatorios_Cursor.md).

Este plano é o mapa de alterações, migração e testes. **Não autoriza ainda alterar formulários, PDF ou textos em produção.** A redacção legal e os critérios técnicos ficam sujeitos a revisão humana (advogado e responsável técnico) antes de qualquer emissão a clientes.

## 1. Objectivo

Os relatórios de elevadores de automóveis devem descrever o que a NAVEL executou, observou e comunicou numa **manutenção preventiva**. Não devem parecer certificação, verificação legal, declaração de conformidade nem autorização de uso.

A protecção da NAVEL vem do âmbito claro, do registo fiel e da prova de comunicação. Nenhuma cláusula é imunidade.

## 2. Âmbito

Entra neste plano a categoria **Elevadores de veículos ligeiros e pesados** e as subcategorias já existentes:

| Id | Subcategoria |
|----|----------------|
| sub1 | Elevador electromecânico de ligeiros, 2 ou 4 colunas |
| sub2 | Elevador electro-hidráulico de 2 colunas |
| sub4 | Elevador de tesoura |
| sub12 | Elevador electro-hidráulico de pesados, 4 colunas móveis |
| sub13 | Elevador electromecânico de pesados, 4 colunas independentes |

Fica de fora, e não se reescreve:

- Compressores, KAESER A/B/C/D, geradores, equilibradores, máquinas de pneus, lavagem.
- O módulo de reparações já existente. Não se acrescentam fluxos de reparação, diagnóstico, certificação ou alteração de máquinas. Também não se apaga o que já serve outros equipamentos.
- Montagem inicial de elevadores, nesta primeira fase. O título e as regras novas aplicam-se à manutenção periódica. A montagem mantém o fluxo actual até decisão própria.
- O relatório histórico **2026.MP.00053** e qualquer outro já emitido. Correcção futura só por aditamento datado, com o original preservado.

## 3. O que a aplicação faz hoje

O técnico preenche um assistente em passos (`ExecutarManutencaoModal`): identificação, checklist, notas, fotos, técnico, nome do cliente, assinatura, fecho. A checklist de elevadores é uma lista fixa por subcategoria, com botões **Sim** e **Não** (`ChecklistStep`). Há também **Marcar todos**.

Cada resposta guarda-se como texto simples: `sim` ou `nao` em `relatorios.checklist_respostas`. O texto do ponto fica congelado em `checklist_snapshot` no momento da gravação (`resolveChecklist.js`). Relatórios antigos sem snapshot usam a lista viva da base de dados.

O PDF e o email (`gerarPdfRelatorio.js`, `relatorioPdfResumo.js`, `servidor-cpanel/send-email.php`) fazem três coisas que a reflexão rejeita:

1. **Título genérico.** A intervenção periódica sai como «Manutenção periódica», não como «Relatório de Manutenção Preventiva».
2. **Veredito por contagem.** Zero «Não» → caixa **CONFORME**. Alguns «Não», mas menos que os «Sim» → **CONFORME COM RESERVAS**. Maioria «Não» → **NÃO CONFORME**. É o caso do fim de curso partido a poder conviver com uma avaliação global positiva.
3. **Frase automática.** Sem «Não», o resumo escreve «Verificação concluída sem não conformidades registadas.»

A declaração que o cliente assina está em `src/constants/relatorio.js`. Nos elevadores afirma que o cliente obteve **todas** as informações de manuseamento seguro, cita EN 1493:2022, a Directiva 2006/42/CE, o Regulamento (UE) 2023/1230 e o DL 50/2005, e impõe conservação de **dois anos**. Esse texto **não fica gravado no relatório**: cada abertura de PDF ou email volta a calculá-lo. Mudar a constante altera também a leitura de relatórios já assinados.

A correcção de admin (`Corrigir relatório`) grava por cima do mesmo registo. Não há versão nem aditamento.

A checklist do PDF é forçada a caber **numa página A4**, com letra a descer até 6,5 pt. Descrições longas não podem entrar nessa página.

No ecrã, a linha da checklist é uma fila (texto + Sim/Não). No telemóvel a fila parte (`Manutencoes.css`, `min-height` de toque). Não há campo de detalhe quando a resposta é Não.

## 4. Decisões que o plano fixa

1. **Ordem do PDF mantém-se** para todas as famílias (cabeçalho, tipo e número, resumo, dados do serviço, pontos de atenção, checklist, notas, fotos, consumíveis, próximas manutenções, declaração, assinaturas, rodapé). O que a reflexão pede na primeira página — âmbito, estado da execução, anomalias e recomendações urgentes — cabe no resumo e nos pontos de atenção, que já estão antes da checklist. Não se reordena o gerador: essa reordenação já provocou regressões.
2. **Elevadores novos usam outro significado; o resto da aplicação não.** Compressores e reparações continuam com o veredito actual até plano próprio.
3. **Respostas antigas continuam a ser `sim` / `nao`.** Respostas novas de elevador podem ganhar detalhe ao lado, sem reescrever o JSON antigo.
4. **O texto assinado congela-se na emissão.** A declaração e o título usados nessa emissão gravam-se no relatório. Reabrir o PDF não puxa o texto novo.
5. **Relatórios já emitidos sem texto congelado** continuam a usar um bloco fixo chamado `legado`, cópia do texto que está hoje em `relatorio.js`. Esse bloco deixa de ser editado. O texto novo só entra em emissões posteriores, depois da revisão humana.
6. **Uma anomalia não se esconde na checklist de uma página.** O ponto fica curto (rótulo + resposta). A descrição, a recomendação e a foto associada aparecem em pontos de atenção e nas notas.
7. **O mesmo formulário serve telemóvel, tablet e PC.** Não há um formulário «de secretária» e outro «de campo». O que muda é a largura: no telemóvel, um cartão por ponto; no tablet e no PC, o mesmo cartão mais largo. Alvos de toque com a altura mínima já usada na aplicação. Cor nunca é o único sinal (há sempre o rótulo Sim, Não, Não aplicável).
8. **Não se decide segurança por palavras-chave nem por modelo de linguagem.** A aplicação impede combinações incoerentes e exige texto. A classificação da gravidade é do técnico.

## 5. Como o formulário deve comportar-se nos três ecrãs

Passos do assistente mantêm-se. No passo da checklist, para elevadores:

- Acção rápida no topo: **«Sem anomalia observada nos pontos aplicáveis»**, em vez de um «Marcar todos» que parece aprovação. O técnico revê e marca excepções.
- Cada ponto é um cartão: número, texto, e três acções grandes — **Executado sem anomalia**, **Anomalia**, **Não aplicável**. No telemóvel as três acções ocupam a largura do cartão, uma por linha ou em grelha de duas, nunca uma fila que obrigue a scroll horizontal.
- **Anomalia** abre, no mesmo cartão, descrição obrigatória e recomendação obrigatória. **Não aplicável** abre fundamento obrigatório. Sem isso o passo não avança.
- Notas, fotos e assinatura continuam nos passos seguintes. A foto de uma anomalia associa-se ao ponto quando o técnico a tira nesse cartão; no PDF entra na secção de fotos já existente e é citada no ponto de atenção.
- A declaração deixa de ser um parágrafo longo só no fim, ilegível no telemóvel. Mostra-se um resumo de 4–6 linhas (âmbito, o que não é, o que o cliente acusa receber) com o texto completo acessível por «Ler declaração completa». O PDF leva o texto completo.
- Tablet: os mesmos cartões, duas colunas só nos dados de cliente e equipamento, nunca na checklist.
- PC: modal largo, cartões em lista única legível, sem tabela densa de 15 colunas.

## 5b. Nota introdutória do PDF (texto fixado em 2026-10-08)

Logo a seguir ao título, em qualquer relatório (elevador, compressor, reparação, montagem ou outro equipamento):

**Âmbito e limites do serviço**

1. O presente documento constitui exclusivamente um relatório de manutenção preventiva / diagnóstico técnico, limitado às operações e pontos de inspeção expressamente identificados.
2. Não constitui declaração CE/UE de conformidade, certificação, avaliação integral de conformidade legal, validação da instalação original, reconstituição do processo técnico do fabricante, ensaio estrutural, ensaio de carga, nem autorização autónoma de colocação ou manutenção em serviço do equipamento.
3. A conclusão é válida apenas para a data, local, condições de acesso, configuração e componentes observados. Não abrange defeitos ocultos, intervenções anteriores de terceiros, alterações não comunicadas, fundações, ancoragens, instalação elétrica, dimensionamento da alimentação, documentação não disponibilizada ou utilização posterior indevida.

O texto é o mesmo em todos os equipamentos. Ao reabrir um PDF, a nota aparece mesmo em relatórios antigos. O veredito, a checklist e a declaração desses relatórios antigos não mudam.

## 6. P0 — o que entra primeiro

Objectivo: uma emissão nova de elevador já não diz «conforme», já não completa frases positivas sozinha, já não deixa um «Não» sem descrição, e já não altera o sentido de um PDF antigo.

| Alteração | Onde | Migração |
|-----------|------|----------|
| Título «Relatório de Manutenção Preventiva» só na manutenção periódica de elevador | `resolveTipoIntervencaoLabel` em `relatorioPdfResumo.js`; o mesmo rótulo no HTML (`RelatorioView`) e no PHP do email | Relatórios antigos: se não tiverem título congelado, mantêm «Manutenção periódica» |
| Substituir a caixa CONFORME / COM RESERVAS / NÃO CONFORME por **estado da manutenção**: concluída no âmbito, parcial, ou suspensa. A contagem, se aparecer, rotula-se «resumo de respostas», sem valor de aprovação | `calcularVereditoChecklist` e `VEREDITO_PDF` passam a ter um ramo de elevador; PHP do email no mesmo ramo | Relatórios antigos sem marca de modelo novo continuam com o veredito actual, para o PDF histórico não mudar de sentido ao ser reaberto |
| Apagar a frase automática «Verificação concluída sem não conformidades registadas» nos elevadores novos. Linha neutra apenas: «Pontos assinalados sem anomalia observada nesta intervenção.» | `buildResumoExecutivoBullets` | Idem: só no modelo novo |
| «Não» sem descrição e sem recomendação bloqueia Gravar. «Não aplicável» sem fundamento bloqueia. Texto positivo automático («bom estado geral», «desgaste normal», «em funcionamento») fica impedido se existir anomalia em aberto | validação em `ExecutarManutencaoModal` antes de `gravar` | Não se revalidam relatórios já gravados |
| Declaração de âmbito (secções 11 e 12 da reflexão) e título «Receção do relatório e tomada de conhecimento» | `src/constants/relatorio.js`, passo do cliente, bloco final do PDF e do email | Texto novo só depois de revisão humana. Até lá, P0 pode ficar preparado com o texto marcado como rascunho e **desligado** em produção |
| Gravar no relatório, no momento da assinatura: versão do modelo, texto integral da declaração, título | colunas JSON já existentes ou um objecto `emissao` dentro de um campo JSON novo, aditivo, sem mudar o significado das colunas actuais | Relatórios sem esse objecto usam o bloco `legado` imutável |
| Correcção de um relatório de elevador já assinado cria **aditamento** (novo número ou sufixo, data, motivo, ligação ao original). Não reutiliza a assinatura. O original permanece | fluxo `isCorrectionMode` / `handleAdminEditSave` para esta família | Admin deixa de poder substituir o conteúdo assinado desta família |
| Conferência de 8 de outubro de 2026: citações incorretas saem das perguntas e da declaração. A nota legal no fecho lista o regime de colocação no mercado, com datas. Os snapshots antigos não são reescritos na base de dados; o ecrã e o PDF limpam a citação ao mostrar | `notaLegalColocacaoMercado.js` | Migração SQL das linhas vivas de `checklist_items`, por correr na publicação |

Não entra em P0: checklist diferente por configuração da máquina, testes funcionais descritivos, catálogo de normas, política de retenção, novos campos de fabricante/placa/capacidade.

### Testes P0

Unitários em `tests/unit/relatorioPdfResumo.test.js` (os três testes actuais do veredito mantêm-se para não-elevador):

- Elevador novo com um «Não» e muitos «Sim»: não produz `conforme` nem `reservas`.
- Elevador novo sem «Não»: não produz a frase «sem não conformidades registadas».
- Respostas antigas `sim`/`nao` sem marca de modelo novo: veredito actual inalterado.
- Declaração: relatório com texto congelado reabre esse texto; relatório sem congelamento reabre o bloco `legado`, mesmo que a constante nova tenha mudado.

Aceitação manual no telemóvel, num tablet e num PC, com a mesma manutenção de elevador:

- Fim de curso partido assinalado e frase de «bom estado»: a gravação não avança.
- Anomalia sem descrição: não avança.
- Manutenção concluída com anomalia: o PDF mostra as duas coisas e não mostra CONFORME.
- PDF de um relatório antigo (por exemplo um já arquivado): título, veredito e declaração iguais aos de hoje.
- Corrigir um relatório assinado: nasce aditamento; o original abre na mesma.

## 7. P1 — checklist que distingue execução de observação

Estado em 1.17.30: implementado na manutenção periódica de elevadores (execução/observação, estado do documento, teste com veículo e 2 ciclos ou sem carga, não aplicável por configuração, receção com função e canal, identificação da visita no relatório). Um documento em falta não conta como anomalia de equipamento.

Os rótulos à direita da checklist são por extenso: ANALISADO, EXECUTADO, NÃO ANALISADO, ANOMALIA, SEM TESTE, SEM CARGA, NÃO EXECUTADO, NÃO OBSERVADO e ILEGÍVEL. O teste com carga mantém «2 CICLOS». A coluna tem 38 mm. A checklist continua a caber numa A4, com a letra a reduzir-se se precisar.



Depois de P0 estável no terreno:

- Cada ponto da checklist de elevador passa a ter papel: operação preventiva, documento, teste funcional ou observação. Pontos que não existem naquela configuração (cabos num elevador sem cabos, redutor num hidráulico) nascem como não aplicáveis, com fundamento, em vez de um Sim forçado.
- A resposta separa **o que foi feito** (executado, parcial, não executado, não aplicável) de **o que se observou** (sem anomalia observada, anomalia, não observado, não aplicável). Uma lubrificação feita não preenche «sem defeito».
- Documentos (manual, declaração CE, marcação CE) usam os estados da reflexão: disponibilizado e analisado, disponibilizado e não analisado, não disponibilizado, ilegível, não aplicável. A assinatura do cliente não transforma «não disponibilizado» em «apresentado».
- Teste funcional deixa de ser a linha única «teste em funcionamento: SIM». Regista-se se correu, se foi sem carga ou com carga, o que se observou e a limitação. Não se chama ensaio formal de carga.
- Receção: nome, função, data e hora. Recusa de assinatura fica registada, com o canal alternativo de entrega. Não se afirma que foram dadas «todas» as informações.
- Identificação do equipamento, em campos aditivos na ficha (não obrigatórios para máquinas já criadas): número de série confirmado no local, foto da placa, ano ou «desconhecido», capacidade comunicada, se foi fornecido pela NAVEL e se foi instalado pela NAVEL — dois campos distintos.

Isto continua em JSON no relatório e na ficha da máquina. Não se criam tabelas de reparação, certificação ou avaliação de conformidade.

O detalhe da anomalia permanece nos pontos de atenção. A checklist tenta ficar numa página; a coluna dos rótulos está reservada para a palavra completa.

## 8. P2 — depois da prática de P0 e P1

Estado em 1.17.30: o PDF não cita normas por validar; a nota legal de colocação no mercado está no fecho; o pedido de reparação, alteração ou certificação fica registado como fora do âmbito e não abre esses serviços; o calendário avisa quando há recomendação de não utilização. Não foi inventado prazo de arquivo. A declaração antiga dos relatórios já emitidos não foi reescrita. A foto da chapa e mais uma foto do equipamento e do local são obrigatórias em qualquer equipamento, na manutenção e na conclusão da reparação. O catálogo de normas continua por validar.



- Catálogo de referências com edição, fonte e data de validação humana. O PDF só cita o que estiver marcado como revisto.
- Admissão de equipamento de terceiro: o técnico confirma que o pedido é manutenção preventiva e regista limitações. Recusa fundamentada nas condições concretas, não numa proibição genérica.
- Retenção, permissões e cópias de segurança revistas com apoio jurídico. Deixa de se escrever «dois anos» como regra universal. O calendário futuro permanece planeamento, não autorização de uso. Se houver recomendação de não utilizar, essa pendência aparece nesse calendário.

## 9. O que não se faz

- Não se reescreve o projecto.
- Não se alteram históricos em lote, nem se reaproveitam assinaturas.
- Não se inventam normas, qualificações ou pareceres.
- Não se usa contagem de itens como aprovação.
- Não se gera interdição «legal» em nome da NAVEL. No máximo, recomendação técnica de não utilização, com destinatário e prova de comunicação.
- Não se mexe na ordem canónica das secções do PDF.
- Não se publica o texto novo da declaração antes da revisão humana.

## 10. Ordem de trabalho quando for para implementar

1. Revisão humana do texto das secções 11 e 12 da reflexão (âmbito e receção).
2. Implementar P0 com o texto aprovado, testes unitários e três ecrãs.
3. Emitir um relatório de ensaio (não enviado a cliente) e comparar com um PDF antigo lado a lado.
4. Só então usar em produção nos elevadores.
5. P1 e P2 em ciclos separados, cada um com o mesmo critério de ecrã.
