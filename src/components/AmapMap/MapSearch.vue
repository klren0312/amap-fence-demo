<template>
  <div class="map-search">
    <input
      v-model="keyword"
      class="search-input"
      type="text"
      placeholder="输入地址搜索"
      @keyup.enter="search"
    />
    <button :disabled="loading" @click="search">搜索</button>
    <ul v-if="results.length" class="search-results">
      <li
        v-for="(r, i) in results"
        :key="i"
        class="search-result"
        @click="pick(r)"
      >
        {{ r.name }}
        <span class="search-addr">{{ r.address }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

interface SearchResult {
  name: string;
  address: string;
  location: [number, number];
}

const props = defineProps<{ geocoder: any }>();
const emit = defineEmits<{
  (e: "select", location: [number, number]): void;
}>();

const keyword = ref("");
const loading = ref(false);
const results = ref<SearchResult[]>([]);

function search() {
  const kw = keyword.value.trim();
  if (!kw || !props.geocoder) return;
  loading.value = true;
  results.value = [];
  props.geocoder.getLocation(kw, (status: string, result: any) => {
    loading.value = false;
    if (status === "complete" && result.geocodes?.length) {
      results.value = result.geocodes.map((g: any) => ({
        name: g.formattedAddress,
        address: g.addressComponent?.town || g.formattedAddress,
        location: [g.location.lng, g.location.lat] as [number, number],
      }));
    } else {
      alert("未找到匹配的地址");
    }
  });
}

function pick(r: SearchResult) {
  emit("select", r.location);
  results.value = [];
}
</script>

<style scoped>
.map-search {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  gap: 6px;
  background: #fff;
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.search-input {
  width: 240px;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.map-search button {
  padding: 6px 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #f8f8f8;
  cursor: pointer;
  font-size: 14px;
}

.map-search button:hover:not(:disabled) {
  background: #e8e8e8;
}

.map-search button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.search-results {
  position: absolute;
  top: 46px;
  left: 0;
  right: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-height: 240px;
  overflow-y: auto;
}

.search-result {
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
}

.search-result:hover {
  background: #f4f8ff;
}

.search-addr {
  display: block;
  color: #888;
  font-size: 12px;
  margin-top: 2px;
}
</style>
