# Raspberry Pi Autoflashing/Configuration tool
The goal of this tool is to provide and easy way to create a raspberry pi image that fits our needs.
It relies on cloud-init config and will install packages and configure the pi during the first boot.
At the moment, Network configuration (Eduroam) is yet to implement.

> [!WARNING]
> This tool is highly experimental. Triple check that you chose the right disk to format or you will loose data

## Running the tool
Plug our SD card in your computer
Run those commands and follow the instructions : 
```
chmod a+x flash.sh
sudo ./flash.sh
```
Sudo privileges are needed because we need to mount/unmount and format the drive

Once the script is done, take the SD card out of your computer and put it in your Raspberry Pi.
Power your raspberry Pi and wait for 5-10 mins.
Once the Pi reboots, you're good to go !