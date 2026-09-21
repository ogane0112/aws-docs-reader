// Command gentoc regenerates public/data/guides.json and
// public/data/toc/{guideId}.json from guides.config.yaml, per the AWS Docs
// Reader requirements doc section 6 ("目次データの生成").
package main

import (
	"flag"
	"log"
	"os"
	"time"

	"github.com/ogane0112/aws-docs-reader/internal/gentoc"
)

func main() {
	configPath := flag.String("config", "guides.config.yaml", "path to guides.config.yaml")
	outDir := flag.String("out", "public/data", "output directory for guides.json and toc/")
	timeout := flag.Duration("timeout", 20*time.Second, "per-request HTTP timeout")
	failOnError := flag.Bool("fail-on-error", false, "exit non-zero if any guide could not be fetched")
	flag.Parse()

	cfg, err := gentoc.LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	fetcher := gentoc.NewHTTPFetcher(*timeout)

	results, err := gentoc.Generate(fetcher, cfg, *outDir, time.Now())
	if err != nil {
		log.Fatalf("generate: %v", err)
	}

	failed := 0
	for _, r := range results {
		if r.Err != nil {
			failed++
		}
	}
	if failed > 0 {
		log.Printf("%d/%d guides failed to fetch", failed, len(results))
		if *failOnError {
			os.Exit(1)
		}
	}
}
