<script setup lang="ts">
console.log("hola");
interface hola {
    adios: string;
}

const saludo: hola = {
    adios: "adios",
};
console.log(saludo);
</script>

<template>
    <p>Hola!!!!!!</p>
</template>

<style scoped>
p {
    color: red;
}
</style>
