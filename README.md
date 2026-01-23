# TC-NET-RTC
Screen streaming using WebRTC and Eduroam

## Organization of the git repo
```
├── Caddyfile               # Config file for the HTTPS server
├── coturn.conf             # Config file for the STUN/TURN server
├── docker-compose.yml      # Infrastructure deployment instructions
├── documentation           # Documentation about this project architecture and technology
│   ├── 1 - SIR - Etat de l'art (version finale).pdf
│   ├── 2 - SIR - Solution retenue.pdf
│   ├── 3 - SIR -WebRTC.pdf
│   ├── 4 - SIR - Rapport Eduroam WebRTC.pdf
│   ├── 5 - SIR - Vecteurs d'attaque.pdf
│   ├── 6 - SIR - Codec.pdf
│   └── 7 - SIR - Alternatives au Raspberry Pi 4.pdf
├── docs_rasp               # Docs related to building a Pi Image that fits our needs
│   └── raspberry.md        # Manual image building
├── rasp                    # Pi Image autobuilder 
│   ├── cloud-init          # Config file for the Pi
│   └── flash.sh            # Flashing tool
├── README.md               # This file
├── www                     # html pages                    
│   ├── index.html          # Sending page
│   ├── index.js            # Main page logic (WebRTC sender)
│   ├── receive.html        # Receiving page logic (WebRTC receiver)
│   └── style.css
└── tc-net                  # Website backend directory
    ├── Dockerfile          # Container build instructions
    ├── package.json        # Dependencies
    └── tc-net.js           # Signaling/API server
```

## Project architecture
For this project, you need a Raspberry Pi:
Follow the instructions in `docs_rasp` to set it up.
> [!NOTE]
> Alternatively, you can try to use the auto-config tool in `rasp` but it's highly experimental

The project server has 3 main parts :
- webserver : Caddy
- backend : tc-net-backend (node)
- STUN/TURN server : Coturn


## Running the project
### Prerequisites
- [ ] A podman/docker host, reachable from the internet
- [ ] A domain
- [ ] Ports 80/tcp, 443/tcp, 3478/tcp-udp, 49152-49250/udp opened in your firewall and pointing to your server

### DNS
On your domain administration page, create those entries : 
| Record Type     | Host            | Value                                 |
| :-------------: |:---------------:| :------------------------------------:|
| A               | api             | x.x.x.x [replace with your server IP] |
| A               | ws              | x.x.x.x [replace with your server IP] |
| A               | stun            | x.x.x.x [replace with your server IP] |
| A               | turn            | x.x.x.x [replace with your server IP] |
| A               | .               | x.x.x.x [replace with your server IP] |

> [!NOTE]
> If you are already using a subdomain of your domain for this project, you could just create two DNS entries :
>| Record Type     | Host            | Value                                 |
>| :-------------: |:---------------:| :------------------------------------:|
>| A               | subdomain       | x.x.x.x [replace with your server IP] |
>| A               | *.subdomain     | x.x.x.x [replace with your server IP] |

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

> [!WARNING]
> If you decide to change the TURN password, you also need to do it in the `site/index.js` and `site/receive.html` files

### Running
To run the stack, just go in the directory where you have cloned the repo and made edits to the config files and run the following command : 
```
docker-compose up -d
```

This will setup everything for you. Just wait a bit until Caddy gets the HTTPS certificates and you will be good to go !