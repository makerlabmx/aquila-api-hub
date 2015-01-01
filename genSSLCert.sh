#! /usr/bin/env bash

# Generating RSA key:
openssl genrsa 1024 > config/ssl/rsaKey.pem


# Generating SSL certificate:
openssl req -new -key config/ssl/rsaKey.pem -out config/ssl/csr.pem
openssl x509 -req -days 365 -in config/ssl/csr.pem -signkey config/ssl/rsaKey.pem -out config/ssl/sslCert.crt
