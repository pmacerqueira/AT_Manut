# NAVEL — Reflexão e especificação para melhorar relatórios de manutenção preventiva

Versão revista após esclarecimento do âmbito da atividade. Este documento substitui a versão anterior para implementação no Cursor.AI.

## 1. Instrução prioritária

A NAVEL realiza exclusivamente MANUTENÇÕES PREVENTIVAS nos elevadores de automóveis. Não implementar serviços ou fluxos de reparação corretiva, diagnóstico especializado, verificação legal de segurança, certificação, avaliação de conformidade ou modificação de máquinas.

Título único dos documentos: “Relatório de Manutenção Preventiva”.

A aplicação é local, no PC, desenvolvida com o Cursor.AI. Antes de alterar, analisar a arquitetura, dados, formulários, templates e geração de PDFs. Não presumir framework ou base de dados.

Este é um documento de reflexão e especificação funcional, não um parecer jurídico. As cláusulas e referências devem ser validadas por advogado e responsável técnico antes de produção.

## 2. A minha intenção

Quero que os relatórios descrevam o que a NAVEL realmente realizou, observou e comunicou. Não quero que a conclusão de uma manutenção seja confundida com aprovação de segurança global, certificação CE ou autorização de utilização.

Não pretendo afastar a responsabilidade da NAVEL pelos trabalhos que executa. Pretendo distinguir essa responsabilidade das obrigações próprias do cliente enquanto titular, utilizador ou empregador. Nenhuma assinatura ou cláusula garante imunidade absoluta.

## 3. Caso que motivou a revisão

Relatório 2026.MP.00053, de 14/04/2026, equipamento OMCN 199.U2 (21000), Município de Ponta Delgada.

O documento regista:
- Marcação CE: NÃO.
- Redutor/motor/travão: NÃO.
- Níveis de óleo/temperaturas: NÃO.
- Cabos de aço: NÃO.
- Dispositivos de segurança e fins de curso: SIM.
- Nota: “Tem um fim de curso partido”.
- Expressões positivas genéricas: desgaste normal, equipamento em bom estado geral e teste em funcionamento.
- Contagem 10 conforme / 4 não conforme.
- Declaração assinada pelo cliente e calendário semestral até 2032.

Problemas: contradição entre fim de curso partido e avaliação positiva; anomalias sem descrição; conclusão genérica potencialmente enganadora; contagem que pode minimizar falhas relevantes; obrigações do cliente confundidas com documentação efetivamente apresentada.

Não inferir que ocorreu ruído, sobreaquecimento ou falha de travão apenas porque um item agrupado recebeu NÃO. Registar o defeito concreto.

Não alterar silenciosamente o relatório histórico: qualquer correção deve ser aditamento/retificação datado, associado ao original, com fundamento e comunicação ao cliente. Não retroagir conclusões nem reutilizar assinaturas para validar novo conteúdo.

## 4. Delimitação do serviço

O formulário deve separar:
1. Operações preventivas previstas.
2. Operações efetivamente executadas.
3. Observações e anomalias detetadas durante a manutenção.
4. Testes funcionais incluídos e respetivas limitações.
5. Recomendações e informação transmitida ao cliente.

Observar um defeito não equivale a prestar diagnóstico especializado. Recomendar avaliação por profissional competente não equivale a realizar essa avaliação. Não criar ordem de reparação ou documento de certificação.

## 5. Identificação do equipamento e cliente

Campos propostos:
- Cliente, titular/utilizador, local exato e contacto responsável.
- Representante do cliente, função e contacto para alertas.
- Fabricante, modelo, número de série confirmado e identificação interna.
- Foto da placa; não presumir que “21000” é número de série.
- Ano de fabrico e data de instalação/entrada em serviço, com fonte ou “desconhecido”.
- Tipo, capacidade nominal, configuração e uso comunicado.
- Fornecido pela NAVEL / instalado pela NAVEL: campos distintos.
- Manual e documentos disponíveis; histórico de manutenção, alterações e acidentes comunicado.

A falência do fornecedor não significa necessariamente desaparecimento do fabricante. A origem de terceiro não torna toda a manutenção proibida: verificar se existem condições para a NAVEL executar o âmbito preventivo com segurança.

## 6. Documentação

Estados por documento:
- Disponibilizado e analisado.
- Disponibilizado mas não analisado.
- Não disponibilizado.
- Ilegível/incompleto.
- Não aplicável, com fundamento.

Não usar “o cliente é responsável por conservar o manual: SIM” como confirmação de que o manual existe. Separar obrigação comunicada de evidência documental.

Registar marcação CE como observação factual. A ausência em máquina antiga não determina, sozinha, ilegalidade: depende do enquadramento temporal e histórico. Não presumir o regime só por ser anterior a 2026.

## 7. Checklist preventiva dinâmica

Adaptar ao modelo, configuração e instruções do fabricante. Não aplicar cabos, redutores ou sistemas inexistentes à máquina.

Para cada operação/ponto:
- Designação e âmbito.
- Executado / parcialmente executado / não executado / não aplicável.
- Resultado observado: sem anomalia observada / anomalia / não observado / não aplicável.
- Método e critério usados, quando pertinente.
- Observações factuais, medições e fotografias.
- Relevância/criticidade fundamentada.
- Recomendação e urgência.
- Limitações e motivo de não execução.

Separar estado da execução de estado observado. Uma lubrificação executada não prova que o componente esteja sem defeitos.

Não usar percentagem ou contagem de itens como aprovação global. Se mantida, identificar como mero resumo de respostas, sem valor de certificação.

## 8. Testes funcionais

Substituir “teste em funcionamento: SIM” por:
- Executado / não executado e motivo.
- Sem carga ou com carga; carga e método de determinação, se conhecidos.
- Funções abrangidas, procedimento e condições.
- Resultados observados e limitações.
- Instrumentos utilizados quando pertinente.

Não presumir que qualquer teste com carga é um ensaio formal de carga. Não executar ensaios perigosos para completar o formulário. Uma anomalia pode justificar suspensão do teste.

## 9. Fecho — nunca uma aprovação global

### Estado da manutenção
- Concluída no âmbito identificado.
- Parcialmente executada, com pendências.
- Suspensa/não executada, com motivo.

### Observações e recomendações
- Sem anomalias observadas nos pontos efetivamente abrangidos, sem juízo global sobre o equipamento.
- Anomalias observadas e comunicadas, com detalhe.
- Recomendação expressa de não utilização/retirada de serviço até correção e avaliação adequada.
- Observação limitada por documentação, acesso ou impossibilidade de teste.

Não disponibilizar estados “apto”, “apto com reservas”, “certificado”, “conforme legalmente” ou “apto até à próxima manutenção”. Uma manutenção concluída pode coexistir com anomalia crítica.

Evitar “interdição legal”, como se a NAVEL fosse autoridade administrativa. Registar recomendação técnica fundamentada, destinatário, urgência e prova de comunicação. A classificação concreta depende da função e evidência do componente: não impor criticidade cega por palavra-chave.

## 10. Validações da aplicação

- Anomalia exige descrição e recomendação.
- Não executado/não observado exige motivo.
- Não aplicável exige fundamento.
- Qualquer dispositivo de segurança danificado + grupo satisfatório: alertar incoerência e exigir esclarecimento antes de emissão.
- Deficiência crítica impede textos positivos automáticos.
- Teste não executado não pode surgir aprovado.
- Documento não apresentado não pode ficar validado por assinatura do cliente.
- Manutenção concluída não deve preencher aprovação de uso.
- Recomendação urgente exige registo de comunicação, sem depender da assinatura (o envio por email pode sanar este requisito, desde que fique registado no relatório essa opção).
- Pedido de alteração ou certificação: assinalar fora do âmbito NAVEL; não gerar novo fluxo desses serviços.
- Pedido de reparação: assinalar que será preparada uma ordem de serviço NAVEL para reparação.

Pesquisa de palavras em notas pode ajudar, mas não substitui classificação técnica humana.

## 11. Texto-base de âmbito

> O presente relatório documenta exclusivamente a manutenção preventiva realizada pela NAVEL, incluindo as operações executadas, as observações efetuadas e os testes funcionais expressamente identificados, nas condições existentes à data da intervenção. Não constitui certificação, declaração de conformidade, verificação legal de segurança, avaliação integral da segurança do equipamento ou validação da instalação original. As anomalias observadas e as recomendações correspondentes são comunicadas ao cliente nos termos registados neste documento. Esta delimitação não afasta as responsabilidades da NAVEL pela manutenção efetivamente realizada nem dispensa o cliente das suas obrigações próprias.

Identificar limitações reais. Não excluir genericamente o que foi contratado ou efetivamente examinado. Não usar defeitos ocultos ou ausência de documentação como exoneração automática de negligência.

## 12. Receção do cliente

Título: “Receção do relatório e tomada de conhecimento”.

> O representante do cliente confirma a receção do presente relatório e a comunicação das anomalias, limitações e recomendações nele expressamente registadas. Quando recomendada a retirada de serviço, foi informado da necessidade de impedir a utilização até à correção das deficiências e à avaliação aplicável. A assinatura não constitui certificação, autorização de uso ou exoneração da NAVEL das responsabilidades que legalmente lhe caibam. Mantêm-se as obrigações próprias do cliente enquanto titular, utilizador ou empregador.

Campos: nome, função, data/hora, canal de entrega e anexos. Permitir registar ausência/recusa de assinatura e comunicação alternativa. Não afirmar automaticamente que foram dadas “todas as informações de manuseamento seguro”; descrever o que realmente foi transmitido.

## 13. Referências legais e normativas — revisão humana obrigatória

Referências discutidas, a conferir na redação e aplicabilidade concretas:
- Decreto-Lei n.º 50/2005, de 25 de fevereiro: utilização de equipamentos de trabalho, manutenção e verificações. Não apresentar a manutenção NAVEL como verificação legal abrangente.
- Decreto-Lei n.º 103/2008, de 24 de junho, e Diretiva 2006/42/CE: conformidade originária/colocação no mercado e entrada em serviço, segundo o regime temporal.
- Lei n.º 102/2009, de 10 de setembro: enquadramento de SST, com confirmação do regime aplicável a cada cliente, incluindo entidades públicas.
- Regulamento (UE) 2023/1230: aplicação geral prevista para 20/01/2027, com disposições antecipadas. Não significa recertificação automática de todo o parque existente.
- EN 1493: confirmar edição, âmbito e harmonização pertinentes antes de citar.

Conferência de 8 de outubro de 2026: as perguntas da checklist e a declaração deixam de citar normas. EN 1493:2020 não existe. Não há EN 16625 para estes elevadores; a ISO 16625 é de seleção de cabos na conceção e não entra na nota. A única lista impressa é a nota legal no fecho dos relatórios de manutenção de elevadores de automóveis: Diretiva 2006/42/CE até 19 de janeiro de 2027, Decreto-Lei n.º 103/2008, EN 1493:2010 (Jornal Oficial de 8 de abril de 2011; o CEN substituiu-a em novembro de 2022), EN 1493:2022 (sem citação no Jornal Oficial à data da conferência, logo sem presunção por si) e Regulamento (UE) 2023/1230 (aplicação geral em 20 de janeiro de 2027). A nota informa o regime de colocação no mercado e não avalia o equipamento da visita.

Distinguir Declaração CE de Conformidade do regime da Diretiva e Declaração UE do regime pertinente; não substituir termos indiscriminadamente em históricos.

Fontes para validação:
- https://diariodarepublica.pt/dr/detalhe/decreto-lei/50-2005-584397
- https://diariodarepublica.pt/dr/detalhe/decreto-lei/103-2008-456188
- https://eur-lex.europa.eu/eli/reg/2023/1230/oj
- https://www.ipq.pt/servicos-ipq/consultar-o-catalogo-de-normas/

Não tratar esta lista como inventário exaustivo de legislação. Não gerar conclusões jurídicas automaticamente.

## 14. Periodicidade e conservação

Identificar fundamento da frequência: manual, contrato, condições de utilização e recomendação fundamentada. Não apresentar periodicidade semestral como obrigação legal universal.

Calendário futuro é planeamento, não aprovação continuada de segurança. Se houver recomendação de retirada de serviço, destacar a pendência no calendário.

Não usar “dois anos” como regra automática de apagar históricos. Separar manutenção de verificação legal e validar política de retenção, documentação, assinaturas e dados pessoais com apoio jurídico.

## 15. Procedimento preventivo para equipamentos de terceiros

1. Confirmar pedido exclusivo de manutenção preventiva.
2. Identificar equipamento, documentação e limitações.
3. Definir operações aceites e meios necessários.
4. Recusar/suspender tarefas sem condições de execução segura.
5. Executar e documentar apenas operações preventivas aceites.
6. Registar anomalias e informação ao cliente.
7. Indicar que reparações, certificação ou alterações solicitadas não integram o serviço.
8. Emitir relatório e conservar prova de entrega.

A recusa deve ser fundamentada nas condições concretas e no âmbito da NAVEL, não numa alegada proibição universal de manutenção de máquinas de terceiros.

## 16. Organização e integridade

- Identificar técnico executor e revisor quando previsto, sem inventar pessoas ou qualificações.
- A revisão interna não deve ser designada “verificação legal”.
- Documentar competências adequadas à manutenção executada.
- Confirmar cobertura de seguro para a atividade efetiva de manutenção preventiva.
- Guardar evidência de entrega e destinatário, especialmente em clientes públicos.
- Permissões, auditoria, backups e controlo de versões.
- Não reutilizar assinatura antiga para novo conteúdo.
- Congelar dados e versão do template de cada emissão.

## 17. Estrutura de dados proposta

Adaptar ao projeto existente:
- Equipment: identificação, origem, datas, configuração, capacidade.
- PreventiveMaintenanceOrder: âmbito, operações previstas, autorização e limitações.
- DocumentObservation: documento, estado e análise efetiva.
- MaintenanceItem: execução, estado observado, método e evidência.
- ObservedAnomaly: descrição, relevância, recomendação e urgência.
- FunctionalTest: procedimento, condições, resultados e limites.
- MaintenanceClosure: estado dos trabalhos e resumo de pendências, sem aptidão global.
- Communication: destinatário, canal, data e evidência.
- ReceiptSignature: identidade, função e significado da assinatura.
- ReportVersion: dados congelados, PDF e vínculo à retificação.
- ReferenceCatalog: edição, fonte, aplicabilidade e validação humana.

Não criar tabelas/fluxos de reparação, certificação ou avaliação de conformidade apenas por terem sido discutidos anteriormente.

## 18. Layout do PDF

Primeira página:
- Título fixo, número e data.
- Cliente, equipamento e localização.
- Âmbito resumido.
- Estado da execução.
- Anomalias relevantes e recomendações urgentes em destaque.

Corpo:
- Operações realizadas/não realizadas.
- Observações, medições e fotografias.
- Testes funcionais e limitações.
- Documentação apresentada/ausente.

Fecho:
- Pendências e recomendações.
- Informação efetivamente transmitida.
- Identificação técnica e receção pelo cliente.
- Planeamento condicionado, versão e páginas.

Eliminar texto cortado, codificação defeituosa e frases genéricas concatenadas. Usar rótulos além das cores. Não esconder alertas apenas em notas finais.

## 19. Prioridades

P0:
- Tipo fixo Manutenção Preventiva.
- Eliminar aprovação global e frases positivas automáticas.
- Resolver contradições e exigir descrição das anomalias.
- Registar recomendações e comunicação.
- Rever referências não validadas.
- Preservar históricos e permitir retificação auditável.

P1:
- Checklist por configuração.
- Separar execução, observação e documentos.
- Testes funcionais descritivos.
- Receção com identidade/função e evidência de entrega.

P2:
- Catálogo normativo controlado.
- Admissão preventiva de terceiros.
- Histórico, retenção, permissões e backups.

## 20. Testes de aceitação

- Fim de curso partido + resposta positiva: alerta exige esclarecimento.
- Uma anomalia crítica + muitos itens positivos: nenhuma aprovação por contagem.
- Manual ausente + cliente reconhece obrigação: permanece ausente.
- Máquina antiga sem CE/data conhecida: não concluir automaticamente ilegalidade.
- Teste sem carga: não gerar ensaio de carga ou certificação.
- Manutenção concluída + risco observado: ambos aparecem, sem aprovação global.
- Pedido de reparação: fora do âmbito, sem ordem corretiva.
- Pedido de alteração de capacidade: fora do âmbito, sem execução preventiva dessa alteração.
- Cliente recusa assinar: permitir comunicação e registo alternativos.
- Correção de PDF emitido: nova versão/aditamento, original preservado.
- Próxima manutenção agendada: não equivale a autorização de uso.

## 21. Instrução final ao Cursor.AI

Analisar o projeto e apresentar primeiro um mapa das alterações, migração e testes. Implementar P0 antes das restantes fases. Não reescrever o projeto inteiro nem alterar históricos automaticamente.

Não inventar normas, qualificações, pareceres ou aprovações de segurança. Não usar IA para decidir autonomamente a segurança de elevadores. Submeter redações legais e critérios técnicos a revisão humana adequada.

O objetivo é um relatório fiel, legível e auditável de MANUTENÇÃO PREVENTIVA: a proteção da NAVEL resulta da execução correta, do âmbito claro e da comunicação documentada, não de uma promessa de imunidade.
