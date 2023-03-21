<script setup lang="ts">
</script>

<template>
    <div class="container">
        <img src="https://fortunescrown.com/wp-content/uploads/2022/03/NFTs.jpg" alt="nft pic">
        <div class="text">
            <p>Cool monkey</p>
            <button>
                <router-link to="/checkout">
                    Buy with CC
                </router-link>
            </button>
        </div>
    </div>
</template>

<style scoped>
.container {
    display: flex;
}

img {
    width: 200px;
    height: 200px;
}

.text {
    margin-left: 10px;
}
</style>
