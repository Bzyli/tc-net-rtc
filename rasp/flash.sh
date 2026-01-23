#!/bin/bash
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root" 
   exit 1
fi

# Find base /dev/sdX devices (not partitions)
mapfile -t DEVICES < <(
  lsblk -dn -o NAME |
  grep -E '^sd[a-z]+$' |
  sed 's|^|/dev/|'
)

if [[ ${#DEVICES[@]} -eq 0 ]]; then
  echo "No /dev/sdX devices found."
  exit 1
fi

echo "Available /dev/sdX devices:"
select DEVICE in "${DEVICES[@]}"; do
  if [[ -n "${DEVICE:-}" ]]; then
    echo
    echo "Selected device: $DEVICE"
    break
  else
    echo "Invalid selection. Try again."
  fi
done

read -rp "WARNING, THIS WILL ERASE EVERYTHING ON $DEVICE. TRIPLE CHECK THAT THIS IS THE RIGHT DEVICE Type YES to continue: " CONFIRM
[[ "$CONFIRM" == "YES" ]] || exit 1

echo "Downloading raspiOS lite img"
wget -O raspiOS_lite.img.xz https://downloads.raspberrypi.com/raspios_lite_arm64/images/raspios_lite_arm64-2025-12-04/2025-12-04-raspios-trixie-arm64-lite.img.xz

umount $DEVICE*
xzcat raspiOS_lite.img.xz | sudo dd of=$DEVICE bs=4M status=progress conv=fsync

echo "Coping image done"
mkdir -p mnt
mount ${DEVICE}1  mnt
cp ./cloud-init mnt/user-data


umount $DEVICE*
exit 0
