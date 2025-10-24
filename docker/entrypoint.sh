#!/bin/sh

# Adapted from:
#https://github.com/nodejs/docker-node/blob/bd31952b241c9e57ff2205294a87dbb55fdb2f26/24/alpine3.22/docker-entrypoint.sh

set -e

# Run command with node if the first argument contains a "-" or is not a system command. The last
# part inside the "{}" is a workaround for the following bug in ash/dash:
# https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=874264
if [ "${1#-}" != "${1}" ] || [ -z "$(command -v "${1}")" ] || { [ -f "${1}" ] && ! [ -x "${1}" ]; }; then
    set -- node "$@"
fi

exec "$@"
