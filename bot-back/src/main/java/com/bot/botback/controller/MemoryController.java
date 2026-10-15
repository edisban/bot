package com.bot.botback.controller;

import com.bot.botback.model.MemoryVault;
import com.bot.botback.repository.MemoryVaultRepository;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class MemoryController {

    private final MemoryVaultRepository memoryVaultRepository;

    public MemoryController(MemoryVaultRepository memoryVaultRepository) {
        this.memoryVaultRepository = memoryVaultRepository;
    }

    @GetMapping("/memory/{userId}")
    public List<MemoryVault> getMemory(@PathVariable Long userId) {
        return memoryVaultRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
