package main

import (
	"encoding/json"
	"io"
	"net/http"
)

func main() {
	http.HandleFunc("/service/method", func(w http.ResponseWriter, r *http.Request) {
		buffer, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Error reading request body", http.StatusBadRequest)
			return
		}
		println(string(buffer))

		var response struct {
			Code int         `json:"code"`
			Msg  string      `json:"msg"`
			Data interface{} `json:"data"`
		}

		response.Code = 12
		response.Msg = "success"
		response.Data = "success data"
		w.Header().Set("Content-Type", "application/json")
		buffer, err = json.Marshal(response)
		if err != nil {
			http.Error(w, "Error marshaling response", http.StatusInternalServerError)
			return
		}
		w.Write(buffer)
	})
	http.ListenAndServe(":8080", nil)
}
