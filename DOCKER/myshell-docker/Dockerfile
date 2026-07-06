FROM gcc:13 AS builder

WORKDIR /build

COPY Shell_final.cpp .

RUN g++ -std=c++17 -O2 -static Shell_final.cpp -o myshell

FROM alpine:3.19

WORKDIR /shell

COPY --from=builder /build/myshell .

RUN chmod +x myshell

CMD ["./myshell"]
