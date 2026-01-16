# TC-NET-RTC
Screen streaming using WebRTC and Eduroam

## Project architecture
The project has 3 main parts :
- webserver : Caddy
- backend : tc-net-backend (node)
- STUN/TURN server : Coturn


## Running the project
### Prerequisites
- [ ] A podman/docker host, reachable from the internet
- [ ] A domain
- [ ] Ports 80, 443, 3478, 49152-49250 opened in your firewall and pointing to your server

### DNS
On your domain administration page, create those entries : 
| Record Type   | Host     | Value  |
| :-------------: |:-------------:| -----:|
| A      | * | $1600 |
| AAAA      |    *   |   $12 |
| zebra stripes | are neat      |    $1 |

### Configuring caddy
The included Caddyfile looks like this :
```
<yourdomain.com> {
	root * /srv
	file_server
}

ws.<yourdomain.com> {
    reverse_proxy tc-net-backend:3000
}

api.<yourdomain.com> {
    reverse_proxy tc-net-backend:3001
}
```
Replace every `<yourdomain.com>` with your actual domain name

### Configuring Coturn
```
# Connection settings
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0

# This is your home IP (required if you are behind a NAT/Router)
# If you have a dynamic IP, you may need a script to update this
external-ip=<public ip>/<local ip>

# Realm and Fingerprint
realm=turn.<yourdomain.com>
fingerprint

# Relay port range (must match your port forwarding)
min-port=49152
max-port=49250

# Authentication (STUN is public, TURN requires a user)
# Syntax: user=username:password
user=tc-net:tc-net

# Security & Performance
lt-cred-mech
no-stdout-log
log-file=/var/tmp/turn.log
```

You can also change the port range if you want something bigger (You also need to update your firewall !)

> [!NOTE]
> If you decide to change the TURN password, you also need to do it in the `site/index.js` and `site/receive.html` files

### Running
To run the stack, just go in the directory where you have cloned the repo and made edits to the config files and run the following command : 
```
docker-compose up -d
```

This will setup everything for you. Just wait a bit until Caddy gets the HTTPS certificates and you will be good to go !