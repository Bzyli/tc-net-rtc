# Documentation technique – Appareil de diffusion non intrusif (Raspberry Pi)

## 1. Introduction

Cette documentation décrit la configuration du  **Raspberry Pi**, destiné à afficher en continu une page web via **Chromium**, lancée automatiquement au démarrage, sans mise en veille ni interruption d’affichage dans le contexte de notre projet.

---

## 2. Matériel et prérequis

### 2.1 Matériel utilisé
- Raspberry Pi 4
- Carte micro‑SD 32 Go
- Alimentation officielle Raspberry Pi
- Écran HDMI
- Connexion réseau Wi‑Fi(Eduroam)

### 2.2 Logiciels et outils
- Raspberry Pi OS Lite (64‑bit)
- Chromium
- Outils de préparation de carte SD :
  - Raspberry Pi Imager
  - Rufus (Windows)
  - `dd` (Linux)

---

## 3. Choix du système d’exploitation

### 3.1 Pourquoi Raspberry Pi OS Lite

Le choix de **Raspberry Pi OS Lite** se justifie par :
- l’absence d’environnement graphique inutile,
- un temps de démarrage plus rapide,
- une consommation mémoire réduite,
- une meilleure stabilité pour un usage embarqué.

L’interface graphique minimale sera installée uniquement pour les besoins de Chromium.

---

## 4. Préparation de la carte SD

### 4.1 Méthode 1 : Raspberry Pi Imager (recommandée)

1. Insérer la carte SD dans l’ordinateur
2. Sélectionner :
   - OS : *Raspberry Pi OS Lite (64‑bit)*
   - Storage : carte SD
3. (Options avancées) :
   - Activer SSH
   - Configurer le Wi‑Fi : chosir le wifi 
   - Définir le nom d’hôte
   - Créer l’utilisateur
4. Flasher la carte SD

### 4.2 Méthode 2 : Rufus (Windows)

1. Télécharger l’image `.img.xz` de Raspberry Pi OS Lite sur le site officiel : https://downloads.raspberrypi.com/raspios_lite_arm64/images/raspios_lite_arm64-2025-12-04/2025-12-04-raspios-trixie-arm64-lite.img.xz
2. Ouvrir Rufus
3. Sélectionner l’image et la carte SD
4. Lancer le flash

### 4.3 Méthode 3 : dd (Linux)

```bash
wget https://downloads.raspberrypi.com/raspios_lite_arm64/images/raspios_lite_arm64-2025-12-04/2025-12-04-raspios-trixie-arm64-lite.img.xz
xzcat 2025-12-04-raspios-trixie-arm64.img.xz | sudo dd of=/dev/sdX bs=4M status=progress conv=fsync
```

---

## 5. Premier démarrage et configuration initiale

L’expérience du premier allumage dépend directement de la **méthode de préparation de la carte SD** utilisée à l’étape 4.

### 5.1 Assistant de configuration (Méthodes 2 & 3 : Rufus / dd)

Lorsque l’image Raspberry Pi OS Lite a été flashée **sans pré‑configuration**, le système démarre sur un **assistant interactif**.

Les étapes principales sont les suivantes :

- **Configuration du clavier**  
  Sélectionner :  
  `Other` → `French` → `French – French (AZERTY)`

- **Création de l’utilisateur**  
  - Nom d’utilisateur : `pi`  
  - Mot de passe : `raspberry`

- **Connexion**  
  Une fois l’assistant terminé, le système affiche une console.  
  Se connecter avec :
  ```
  login: pi
  password: raspberry
  ```

---

### 5.2 Cas de la Méthode 1 : Raspberry Pi Imager

Si les **options avancées** de Raspberry Pi Imager ont été utilisées lors du flashage (création de l’utilisateur, configuration réseau, activation SSH), l’assistant de configuration n’apparaît pas.

Le système démarre directement sur une **console**.  
Il suffit alors de se connecter avec l’utilisateur (pi) défini lors de la préparation de la carte SD.

---

### 5.3 Mise à jour initiale du système

> **NB** : Nous faisons cette partie à fin pour les méthodes (2 & 3).

Quelle que soit la méthode utilisée, il est recommandé d’effectuer immédiatement une mise à jour complète du système :

```bash
sudo apt update && sudo apt full-upgrade -y
```

Redémarrer ensuite le système :

```bash
sudo reboot
```

---

## 6. Configuration du réseau et mises à jour

Cette section décrit la configuration complète du réseau, depuis le déblocage du Wi‑Fi jusqu’à la connexion automatique au réseau **Eduroam**, ainsi que les mises à jour initiales du système.

---

### 6.1 Déblocage du Wi‑Fi (rfkill)

Lors du premier démarrage, il est fréquent que l’interface Wi‑Fi soit bloquée par défaut. Le message suivant peut apparaître :

> *Wi‑Fi is currently blocked by rfkill*

Ce blocage est généralement dû à l’absence de définition du **pays d’utilisation du Wi‑Fi**, exigée pour des raisons réglementaires.

#### 6.1.1 Définition du pays Wi‑Fi

Lancer l’outil de configuration :

```bash
sudo raspi-config
```

Dans le menu :
- `5 Localisation Options`
- `L4 WLAN Country`
- Sélectionner `FR France`
- Valider avec `Finish`

Cette étape est indispensable pour activer correctement l’interface Wi‑Fi.

#### 6.1.2 Déblocage de l’interface Wi‑Fi

Exécuter ensuite la commande suivante afin de lever tous les blocages radio :

```bash
sudo rfkill unblock all
```

---

### 6.2 Connexion réseau temporaire (Wi‑Fi ou Ethernet)

Pour poursuivre la configuration, une connexion réseau fonctionnelle est nécessaire.

Deux solutions sont possibles :
- connexion filaire via câble Ethernet (solution la plus simple),
- connexion temporaire à un réseau Wi‑Fi classique.

Connexion à un réseau Wi‑Fi via NetworkManager :

```bash
sudo nmcli --ask dev wifi connect "Nom_du_WiFi"
```

Le mot de passe du réseau est demandé de manière interactive.

---

### 6.3 Installation de l’outil de connexion Eduroam

La connexion au réseau **Eduroam** est réalisée à l’aide de l’outil officiel `geteduroam`.

Téléchargement du paquet :

```bash
wget https://github.com/geteduroam/linux-app/releases/download/0.12/geteduroam-cli_linux_arm64.deb
```

Installation :

```bash
sudo apt install ./geteduroam-cli_linux_arm64.deb
```

---

### 6.4 Configuration de la connexion Eduroam

Lancer l’outil interactif :

```bash
sudo geteduroam-cli
```

Suivre ensuite les instructions affichées à l’écran :

- **Organisation**  
  À la question *Please enter your organization*, saisir :  
  `INSA Lyon`

- **Choix de l’établissement**  
  Une liste d’organisations s’affiche. Entrer le numéro correspondant à **INSA Lyon** (`6`).

- **Identifiants institutionnels**  
  - *Please enter your username* : identifiant institutionnel
  - *Please enter your password* : mot de passe habituel
  - *Please confirm your password* : confirmation du mot de passe

---

### 6.5 Finalisation et vérification

Si la configuration est correcte, le message suivant s’affiche :

> *The eduroam profile has been added to NetworkManager*

Cela signifie que :
- le profil Eduroam a été correctement installé,
- la connexion est désormais **automatique au démarrage**.

Une vérification peut être effectuée en désactivant toute autre connexion (partage de connexion, Ethernet) et en redémarrant le Raspberry Pi.

Le système doit alors se connecter automatiquement au réseau Eduroam sans intervention manuelle.

Les fichiers de configuration générés sont stockés dans :

```
/etc/NetworkManager/system-connections/
```

---

### 6.6 Automatisation de la connexion au démarrage (crucial)

Afin de garantir un fonctionnement totalement autonome de l’appareil (sans clavier ni intervention humaine), il est indispensable de s’assurer que la connexion **Eduroam s’active automatiquement dès l’allumage** du Raspberry Pi.

Par défaut, certains profils NetworkManager peuvent être restreints à un utilisateur spécifique ou nécessiter une session interactive. La configuration suivante permet de lever ces restrictions.

Exécuter la commande suivante :

```bash
sudo nmcli connection modify "eduroam (from geteduroam)" connection.permissions "" connection.autoconnect yes
```

Cette commande permet de :
- supprimer toute restriction d’utilisateur (`connection.permissions`),
- autoriser la connexion automatique au démarrage du système (`autoconnect`).

---


## 7. Installation de l’environnement graphique minimal

Installation d’un serveur X léger et d’Openbox :

```bash
sudo apt install --no-install-recommends \
  xserver-xorg \
  xinit \
  openbox \
  unclutter
```

Installation de Chromium :

```bash
sudo apt install --no-install-recommends chromium
```

---

## 8. Mise en place du mode Kiosk

### 8.1 Création de l’utilisateur dédié

Pour des raisons de sécurité et de stabilité, un utilisateur dédié est créé :

```bash
sudo useradd -m -s /bin/bash kiosk
```

```bash
sudo mkdir -p /home/kiosk/.config/openbox
sudo chown -R kiosk:kiosk /home/kiosk
```

---

## 9. Gestion de la session graphique avec LightDM

Installation du gestionnaire de connexion :

```bash
sudo apt install --no-install-recommends lightdm
```

Configuration de l’auto-login (`/etc/lightdm/lightdm.conf`) :

```ini
[Seat:*]
autologin-user=kiosk
autologin-session=openbox
```

---

## 10. Lancement automatique de Chromium

### 10.1 Script Openbox

Fichier `/home/kiosk/.config/openbox/autostart` :

```bash
#!/bin/bash

xset s off
xset s noblank
xset -dpms

unclutter -idle 0.1 -grab -root &

xrandr --auto

while :
  do
    chromium \
      --no-first-run \
      --disk-cache-dir=/tmp \
      --disk-cache-size=1 \
      --start-maximized \
      --disable \
      --disable-translate \
      --disable-infobars \
      --disable-suggestions-service \
      --disable-save-password-bubble \
      --disable-session-crashed-bubble \
      --incognito \
      --kiosk "https://tc-net.bzy.li/receive.html?roomID=reunion"
    sleep 3
  done &

```

```bash
sudo chown kiosk:kiosk /home/kiosk/.config/openbox/autostart
chmod +x /home/kiosk/.config/openbox/autostart
```

---

## 11. Désactivation de la veille et de l’économie d’énergie

### 11.1 Écran HDMI toujours actif

Dans `/boot/firmware/config.txt` :

```ini
hdmi_blanking=0
```

### 11.2 Désactivation de la mise en veille système

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

---

## 12. Optimisation du temps de démarrage

Analyse du démarrage :

```bash
systemd-analyze
systemd-analyze blame
systemd-analyse critical-chain
```

### 12.1 Désactivation des services inutiles

```bash
sudo systemctl disable bluetooth.service
sudo systemctl disable NetworkManager-wait-online.service
sudo systemctl disable apt-daily.timer
sudo systemctl disable apt-daily-upgrade.timer
sudo systemctl disable systemd-binfmt.service
sudo systemctl disable avahi-daemon.service
sudo systemctl disable ModemManager.service
sudo systemctl disable rpi-eeprom-update.service
sudo systemctl disable udisks2.service
sudo systemctl disable ssh.service
sudo systemctl enable ssh.socket
sudo systemctl disable console-setup.service
sudo systemctl disable keyboard-setup.service

```

Redémarrage et nouvelle analyse :

```bash
sudo reboot
systemd-analyze blame
```

---



