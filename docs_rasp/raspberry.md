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
   - Configurer le Wi‑Fi
   - Définir le nom d’hôte
   - Créer l’utilisateur
4. Flasher la carte SD

### 4.2 Méthode 2 : Rufus (Windows)

1. Télécharger l’image `.img.xz` de Raspberry Pi OS Lite
2. Ouvrir Rufus
3. Sélectionner l’image et la carte SD
4. Lancer le flash

### 4.3 Méthode 3 : dd (Linux)

```bash
xzcat raspberry-pi-os-lite.img.xz | sudo dd of=/dev/sdX bs=4M status=progress conv=fsync
```


---

## 5. Premier démarrage et configuration initiale

Après le flash de la carte SD et le premier démarrage :

```bash
sudo apt update && sudo apt full-upgrade -y
```

Configuration de base avec `raspi-config` :

```bash
sudo raspi-config
```

Paramètres importants :
- Localisation (clavier, langue, fuseau horaire)
- Activation SSH
- Configuration réseau si nécessaire

Redémarrage :

```bash
sudo reboot
```

---

## 6. Configuration du réseau

### 6.1 Connexion Wi-Fi / Eduroam

Le Raspberry Pi peut être connecté soit via Wi-Fi classique, soit via **Eduroam** (en environnement universitaire).

Installation de NetworkManager (déjà présent par défaut sur Raspberry Pi OS récent) et configuration via interface texte :

```bash
sudo nmtui
```

Pour Eduroam, utilisation de l’outil officiel :

```bash
sudo wget https://github.com/geteduroam/linux-app/releases/download/0.12/geteduroam-cli_linux_arm64.deb
sudo apt install ./geteduroam-cli_linux_arm64.deb
sudo geteduroam-cli
```

Les fichiers de configuration générés sont stockés dans :

```
/etc/NetworkManager/system-connections/
```

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



