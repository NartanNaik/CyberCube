"""
Generates three synthetic demo captures for the PCAP upload modal.
Writes files only (no packets are sent on any network).

    pip install scapy
    python generate_demo_pcaps.py

Output (put these in your backend repo, e.g. backend/demo_pcaps/):
    low_threat.pcap     normal browsing + DNS, complete bidirectional sessions
    medium_threat.pcap  same 2-flow port-scan shape as the original live_sample.pcap
    high_threat.pcap    SYN flood from many sources + SSH brute-force attempts
"""
import random
from scapy.all import Ether, IP, TCP, UDP, DNS, DNSQR, Raw, wrpcap

random.seed(7)
MAC_A, MAC_B = "00:11:22:33:44:55", "aa:bb:cc:dd:ee:ff"
t = 1_700_000_000.0  # fake clock; each packet gets its own timestamp


def stamp(pkt, dt):
    global t
    t += dt
    pkt.time = t
    return pkt


def eth(src_ip, dst_ip):
    return Ether(src=MAC_A, dst=MAC_B) / IP(src=src_ip, dst=dst_ip)


# ---------- LOW: normal, complete sessions ----------
def build_low():
    pkts = []
    client, server = "10.0.2.15", "93.184.216.34"
    for _ in range(4):
        sp = random.randint(40000, 60000)
        seq, ack = random.randint(1, 10**6), random.randint(1, 10**6)
        pkts += [
            stamp(eth(client, server) / TCP(sport=sp, dport=80, flags="S", seq=seq), 0.20),
            stamp(eth(server, client) / TCP(sport=80, dport=sp, flags="SA", seq=ack, ack=seq + 1), 0.02),
            stamp(eth(client, server) / TCP(sport=sp, dport=80, flags="A", seq=seq + 1, ack=ack + 1), 0.01),
            stamp(eth(client, server) / TCP(sport=sp, dport=80, flags="PA", seq=seq + 1, ack=ack + 1)
                  / Raw(b"GET / HTTP/1.1\r\nHost: example.com\r\n\r\n"), 0.05),
            stamp(eth(server, client) / TCP(sport=80, dport=sp, flags="PA", seq=ack + 1, ack=seq + 40)
                  / Raw(b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n"), 0.04),
            stamp(eth(client, server) / TCP(sport=sp, dport=80, flags="FA", seq=seq + 40, ack=ack + 40), 0.10),
            stamp(eth(server, client) / TCP(sport=80, dport=sp, flags="FA", seq=ack + 40, ack=seq + 41), 0.02),
        ]
    for name in ("example.com", "github.com"):
        sp = random.randint(40000, 60000)
        pkts.append(stamp(eth(client, "8.8.8.8") / UDP(sport=sp, dport=53) / DNS(rd=1, qd=DNSQR(qname=name)), 0.3))
        pkts.append(stamp(eth("8.8.8.8", client) / UDP(sport=53, dport=sp) / DNS(qr=1, qd=DNSQR(qname=name)), 0.03))
    return pkts


# ---------- MEDIUM: same shape as the original live_sample.pcap (2 flows) ----------
def build_medium():
    pkts = []
    target = "10.0.1.10"
    for i in range(10):   # 10 bare SYNs from one external scanner to port 80
        pkts.append(stamp(eth("185.220.101.42", target)
                          / TCP(sport=41500 + i, dport=80, flags="S", seq=10000 + i), 0.333))
    for i in range(5):    # 5 probes for /admin from an internal host
        pkts.append(stamp(eth("10.0.2.15", target)
                          / TCP(sport=41510 + i, dport=80, flags="S", seq=10010 + i)
                          / Raw(b"GET /admin HTTP/1.1\r\nHost: internal.corp\r\n\r\n"), 0.333))
    return pkts


# ---------- HIGH: SYN flood (many sources) + SSH brute force ----------
def build_high():
    pkts = []
    victim = "10.0.2.20"
    sources = [f"203.0.113.{i}" for i in range(1, 61)]
    for _ in range(25):                       # 60 sources x 25 rounds = 1500 SYNs at port 80
        for src in sources:
            pkts.append(stamp(eth(src, victim)
                              / TCP(sport=random.randint(1024, 65535), dport=80, flags="S"), 0.0005))
    brute = "198.51.100.77"
    for _ in range(150):                      # repeated short connections to SSH
        sp = random.randint(40000, 60000)
        pkts.append(stamp(eth(brute, victim) / TCP(sport=sp, dport=22, flags="S"), 0.01))
        pkts.append(stamp(eth(brute, victim) / TCP(sport=sp, dport=22, flags="PA")
                          / Raw(b"SSH-2.0-libssh_0.9\r\n"), 0.005))
        pkts.append(stamp(eth(brute, victim) / TCP(sport=sp, dport=22, flags="R"), 0.005))
    return pkts


if __name__ == "__main__":
    for name, fn in (("low_threat", build_low), ("medium_threat", build_medium), ("high_threat", build_high)):
        p = fn()
        wrpcap(f"{name}.pcap", p)
        print(f"{name}.pcap: {len(p)} packets")
