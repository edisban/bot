package com.bot.botback.repository;

import com.bot.botback.model.MemoryVault;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MemoryVaultRepository extends JpaRepository<MemoryVault, Long> {

    List<MemoryVault> findByUserIdOrderByCreatedAtDesc(Long userId);
}
