// Load tester untuk endpoint POST /api/v1/checkout.
// Mengirim N request checkout dengan checkout_request_id unik dan concurrency tetap.
// Usage: go run loadtest.go -total 6000 -concurrency 100
package main

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	mathrand "math/rand"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type checkoutItem struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

type checkoutRequest struct {
	CheckoutRequestID string         `json:"checkout_request_id"`
	OutletID          string         `json:"outlet_id"`
	Items             []checkoutItem `json:"items"`
	PaymentMethod     string         `json:"payment_method"`
}

type result struct {
	status  int
	latency time.Duration
	body    string
}

func randomID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

func percentiles(lat []time.Duration, p float64) time.Duration {
	if len(lat) == 0 {
		return 0
	}
	idx := int(float64(len(lat)-1) * p)
	return lat[idx]
}

func main() {
	var url, tokenFile, outletID, productsCSV string
	var total, concurrency, itemsPerReq int

	flag.StringVar(&url, "url", "http://localhost:3001/api/v1/checkout", "checkout endpoint")
	flag.StringVar(&tokenFile, "token", "token.txt", "file berisi JWT access token")
	flag.StringVar(&outletID, "outlet", "00000000-0000-4000-8000-000000000001", "outlet id")
	flag.StringVar(&productsCSV, "products", "00000000-0000-4000-8000-000000000010,00000000-0000-4000-8000-000000000011,00000000-0000-4000-8000-000000000012,00000000-0000-4000-8000-000000000013,00000000-0000-4000-8000-000000000014", "product ids dipisah koma")
	flag.IntVar(&total, "total", 6000, "jumlah request")
	flag.IntVar(&concurrency, "concurrency", 100, "jumlah worker paralel")
	flag.IntVar(&itemsPerReq, "items", 3, "jumlah item per checkout")
	flag.Parse()

	tokenBytes, err := os.ReadFile(tokenFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "gagal baca token: %v\n", err)
		os.Exit(1)
	}
	token := strings.TrimSpace(string(tokenBytes))
	products := strings.Split(productsCSV, ",")

	latencies := make([]time.Duration, 0, total)
	var mu sync.Mutex
	statusCounts := make(map[int]int64)
	var errorSamples []string
	var sent int64
	var failed int64

	jobs := make(chan int)
	var wg sync.WaitGroup
	client := &http.Client{
		Timeout: 60 * time.Second,
		Transport: &http.Transport{
			MaxIdleConnsPerHost: concurrency,
		},
	}

	worker := func() {
		defer wg.Done()
		for range jobs {
			n := mathrand.Intn(itemsPerReq)
			if n == 0 {
				n = 1
			}
			items := make([]checkoutItem, n)
			for j := 0; j < n; j++ {
				items[j] = checkoutItem{
					ProductID: products[mathrand.Intn(len(products))],
					Quantity:  mathrand.Intn(3) + 1,
				}
			}
			payload, _ := json.Marshal(checkoutRequest{
				CheckoutRequestID: randomID(),
				OutletID:          outletID,
				Items:             items,
				PaymentMethod:     "CASH",
			})

			start := time.Now()
			req, _ := http.NewRequest("POST", url, bytes.NewReader(payload))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+token)
			resp, err := client.Do(req)
			lat := time.Since(start)

			status := 0
			var body string
			if err != nil {
				body = "transport-error: " + err.Error()
				atomic.AddInt64(&failed, 1)
			} else {
				b, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
				resp.Body.Close()
				status = resp.StatusCode
				body = strings.TrimSpace(string(b))
			}

			mu.Lock()
			latencies = append(latencies, lat)
			statusCounts[status]++
			if status < 200 || status >= 300 {
				if len(errorSamples) < 10 {
					errorSamples = append(errorSamples, fmt.Sprintf("status=%d lat=%v body=%s", status, lat, truncate(body, 300)))
				}
			}
			mu.Unlock()
			atomic.AddInt64(&sent, 1)
		}
	}

	fmt.Printf("Load test: total=%d concurrency=%d url=%s\n", total, concurrency, url)
	startAll := time.Now()
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go worker()
	}
	for i := 0; i < total; i++ {
		jobs <- i
	}
	close(jobs)
	wg.Wait()
	elapsed := time.Since(startAll)

	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
	var totalLat time.Duration
	for _, l := range latencies {
		totalLat += l
	}

	var success int64
	for code, n := range statusCounts {
		if code >= 200 && code < 300 {
			success += n
		}
	}

	fmt.Println("\n=== Hasil load test ===")
	fmt.Printf("  total request   : %d\n", sent)
	fmt.Printf("  sukses (2xx)    : %d\n", success)
	fmt.Printf("  gagal/error     : %d\n", failed+statusCounts[0])
	fmt.Printf("  durasi total    : %v\n", elapsed)
	if elapsed.Seconds() > 0 {
		fmt.Printf("  throughput      : %.0f req/s\n", float64(sent)/elapsed.Seconds())
	}
	if len(latencies) > 0 {
		fmt.Printf("  latensi         : avg=%v p50=%v p95=%v p99=%v max=%v\n",
			totalLat/time.Duration(len(latencies)),
			percentiles(latencies, 0.5),
			percentiles(latencies, 0.95),
			percentiles(latencies, 0.99),
			latencies[len(latencies)-1])
	}
	fmt.Println("  status histogram:")
	for _, code := range sortedStatusCodes(statusCounts) {
		fmt.Printf("    %d -> %d\n", code, statusCounts[code])
	}
	if len(errorSamples) > 0 {
		fmt.Println("  sample error:")
		for _, s := range errorSamples {
			fmt.Printf("    %s\n", s)
		}
	}
}

func sortedStatusCodes(m map[int]int64) []int {
	keys := make([]int, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Ints(keys)
	return keys
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}