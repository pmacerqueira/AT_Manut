#!/bin/bash
# Wrapper para forwarder cPanel + CloudLinux CageFS.
# O Exim não deve fazer pipe directo ao .php (cagefs_enter falha em muitos hosts).
#
# INSTALAÇÃO:
#   1. No cPanel → File Manager → criar pasta bin em /home/navel/bin (se não existir)
#   2. Enviar este ficheiro para /home/navel/bin/istobal-pipe.sh
#   3. Terminal: chmod 755 /home/navel/bin/istobal-pipe.sh
#   4. Forwarder "Pipe to a Program" → caminho RELATIVO à home:
#        bin/istobal-pipe.sh
#
# Ajusta PHP_BIN se `which php` no Terminal for outro caminho.

PHP_BIN="/usr/local/bin/php"
SCRIPT="/home/navel/public_html/api/parse-istobal-email.php"

exec "$PHP_BIN" -q "$SCRIPT"
