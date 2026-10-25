"""Local-only socket demo: start `server`, then run `client --count 1` or `--count 30`."""
import argparse
import os
import socket
import time
from contextlib import ExitStack


def serve(port):
    """Accept and retain loopback connections, so the OS monitor can sample both ends."""
    with ExitStack() as stack:
        server = stack.enter_context(socket.socket())
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('127.0.0.1', port))
        server.listen(100)
        print(f'Server PID {os.getpid()} listening on 127.0.0.1:{server.getsockname()[1]}', flush=True)
        # A bounded demo avoids retaining unlimited accepted sockets.
        for _ in range(100):
            connection, _ = server.accept()
            stack.enter_context(connection)
        print('Demo limit reached; holding sockets for 20 seconds.', flush=True)
        time.sleep(20)


def connect(port, count, hold):
    """Open a bounded burst to the local demo server and keep sockets visible to sampling."""
    with ExitStack() as stack:
        for _ in range(count):
            stack.enter_context(socket.create_connection(('127.0.0.1', port), timeout=3))
        print(f'Client PID {os.getpid()}: {count} connections to 127.0.0.1:{port}; holding for {hold}s.', flush=True)
        time.sleep(hold)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['server', 'client'])
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--count', type=int, choices=range(1, 101), default=30, metavar='1-100')
    parser.add_argument('--hold', type=int, choices=range(5, 61), default=20, metavar='5-60')
    args = parser.parse_args()
    if not 0 <= args.port <= 65535 or (args.mode == 'client' and args.port == 0):
        parser.error('Use a port between 1 and 65535 (server may use 0 for an available port).')
    try:
        if args.mode == 'server':
            serve(args.port)
        else:
            connect(args.port, args.count, args.hold)
    except KeyboardInterrupt:
        pass  # Ctrl+C is an intentional demo shutdown; context managers close sockets.
    except OSError as error:
        parser.exit(1, f'Demo failed: {error}\nStart the demo server first and check the port.\n')


if __name__ == '__main__':
    main()
